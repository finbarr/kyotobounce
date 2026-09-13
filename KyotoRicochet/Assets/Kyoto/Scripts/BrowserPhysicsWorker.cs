#if !UNITY_WEBGL || UNITY_EDITOR
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using UnityEngine;

namespace Kyoto
{
    // One frozen collision world, with an independent solver and analytic clock
    // per browser session. Guests never share a live ball or a selected level.
    public sealed class BrowserPhysicsWorker : MonoBehaviour
    {
        [Serializable] class Auth {public string type="auth",token;}
        [Serializable] class Ready
        {
            public string type="ready",layout,profile,physics=BrowserSession.SimulationVersion;
            public Vector3 spawn;public float radius;public string[] capabilities=new[]{"waypoint-v3","shot-stream-v1","shot-speed-v1","design-ball-v1"};
        }
        readonly ConcurrentQueue<BrowserSession.Command> commands=new ConcurrentQueue<BrowserSession.Command>();
        readonly Dictionary<string,BrowserSession> sessions=new Dictionary<string,BrowserSession>();
        TcpClient socket;StreamWriter output;Thread reader;
        volatile bool disconnected;
        StationLayout layout;string hash;double nextSend;
        // Opt-in local diagnostics only: no telemetry or protocol payload changes.
        readonly bool timing=Environment.GetEnvironmentVariable("KYOTO_NATIVE_TIMING")=="1";
        readonly Samples updateGaps=new Samples(),publicationMs=new Samples(),serializeMs=new Samples(),writeMs=new Samples();
        const double PublishInterval=1.0/30;
        double lastUpdate,reportAt;int queueHighWater,publications,skippedPublications,lastGC;
        sealed class Samples
        {
            readonly List<double> values=new List<double>(512);
            public void Add(double value){if(values.Count<4096)values.Add(value);}
            public object Take(){values.Sort();int n=values.Count;double sum=0;foreach(double value in values)sum+=value;
                var result=new TimingMetric{count=n,mean=n>0?sum/n:0,p50=n>0?values[n/2]:0,p99=n>0?values[Math.Min(n-1,(int)(n*.99))]:0,max=n>0?values[n-1]:0};values.Clear();return result;}
        }
        [Serializable] sealed class TimingMetric {public int count;public double mean,p50,p99,max;}
        [Serializable] sealed class TimingReport
        {
            public string type="native-timing";public double wallTime;public int sessions,queueHighWater,publications,skippedPublications,collections;public long heapBytes;
            public TimingMetric updateGapMs,publicationMs,serializationMs,writeMs;
        }
        static double Milliseconds()=>System.Diagnostics.Stopwatch.GetTimestamp()*1000.0/System.Diagnostics.Stopwatch.Frequency;
        void ReportTiming(double now)
        {
            if(now<reportAt)return;reportAt=now+5;
            int collections=GC.CollectionCount(0);
            Debug.Log("KYOTO_NATIVE_TIMING "+JsonUtility.ToJson(new TimingReport{wallTime=now,sessions=sessions.Count,queueHighWater=queueHighWater,publications=publications,skippedPublications=skippedPublications,collections=collections-lastGC,heapBytes=GC.GetTotalMemory(false),updateGapMs=(TimingMetric)updateGaps.Take(),publicationMs=(TimingMetric)publicationMs.Take(),serializationMs=(TimingMetric)serializeMs.Take(),writeMs=(TimingMetric)writeMs.Take()}));
            queueHighWater=publications=skippedPublications=0;lastGC=collections;
        }
        void Start()
        {
            try
            {
                layout=JsonUtility.FromJson<StationLayout>(File.ReadAllText(Environment.GetEnvironmentVariable("KYOTO_LAYOUT")));
                hash=Environment.GetEnvironmentVariable("KYOTO_LAYOUT_SHA");
                var root=new GameObject("Frozen atrium collision");StationWorld.Create(root.transform,layout,true,true);
                StationMotion.SetAnalyticOnly(gameObject.scene,true);Physics.simulationMode=SimulationMode.Script;
                Time.fixedDeltaTime=BallBody.Step;Time.maximumDeltaTime=.1f;
                QualitySettings.vSyncCount=0;Application.targetFrameRate=60;Application.runInBackground=true;
                Physics.SyncTransforms();
                socket=new TcpClient("127.0.0.1",int.Parse(Environment.GetEnvironmentVariable("KYOTO_WORKER_PORT")));
                socket.NoDelay=true;socket.SendTimeout=3000;
                output=new StreamWriter(socket.GetStream(),new UTF8Encoding(false)){AutoFlush=true};
                Send(new Auth{token=Environment.GetEnvironmentVariable("KYOTO_WORKER_TOKEN")});
                reader=new Thread(ReadCommands){IsBackground=true};reader.Start();
                var profile=BallProfile.Phase2Default;
                Send(new Ready{layout=hash,profile=profile.id,spawn=layout.spawn,radius=profile.radius_m});
                Debug.Log("KYOTO_NATIVE_WORKER_READY "+hash);
            }
            catch(Exception e){Debug.LogException(e);Application.Quit(1);enabled=false;}
        }
        void ReadCommands()
        {
            try
            {
                using(var input=new StreamReader(socket.GetStream(),Encoding.UTF8))
                {
                    string line;
                    while((line=input.ReadLine())!=null)
                    {if(line.Length>65536)break;commands.Enqueue(JsonUtility.FromJson<BrowserSession.Command>(line));}
                }
            }
            catch(Exception){}
            disconnected=true;
        }
        void Send(object data)
        {
            try{
                if(!timing){output?.WriteLine(JsonUtility.ToJson(data));return;}
                double begin=Milliseconds();string json=JsonUtility.ToJson(data);double serialized=Milliseconds();
                output?.WriteLine(json);serializeMs.Add(serialized-begin);writeMs.Add(Milliseconds()-serialized);
            }catch(IOException){disconnected=true;}
        }
        void Update()
        {
            if(disconnected){Application.Quit();return;}
            double frameStart=timing?Milliseconds():0;
            if(timing){if(lastUpdate>0)updateGaps.Add(frameStart-lastUpdate);lastUpdate=frameStart;queueHighWater=Math.Max(queueHighWater,commands.Count);}
            int budget=128;
            while(budget-->0&&commands.TryDequeue(out var command))
            {
                if(command==null)continue;
                if(command.type=="shutdown"){Application.Quit();return;}
                if(string.IsNullOrEmpty(command.id))continue;
                if(command.type=="join")
                {if(!sessions.ContainsKey(command.id))sessions.Add(command.id,new BrowserSession(layout,hash,command.id,Send));continue;}
                if(!sessions.TryGetValue(command.id,out var session))continue;
                if(command.type=="leave"){session.Dispose();sessions.Remove(command.id);continue;}
                session.Handle(command);
            }
            // Yield between batches and rotate priority so future flight never
            // monopolizes the worker while other players walk and aim.
            var active=new List<BrowserSession>(sessions.Values);
            double deadline=Milliseconds()+8;
            if(active.Count>0){
                aheadCursor%=active.Count;
                bool worked=true;
                while(worked&&Milliseconds()<deadline){worked=false;
                    for(int i=0;i<active.Count&&Milliseconds()<deadline;i++){
                        var session=active[(aheadCursor+i)%active.Count];
                        if(session.CanAdvanceAhead){session.AdvanceAhead();worked=true;}
                    }
                }
                aheadCursor=(aheadCursor+1)%active.Count;
            }
            double now=Time.realtimeSinceStartupAsDouble;
            if(now>=nextSend)
            {
                // Advance the deadline, not the observed frame time: small frame
                // jitter must not accumulate into a permanent 24-26 Hz stream.
                // Publish only one current batch per Update. After a long stall,
                // discard missed slots and rebase; never replay stale snapshots.
                if(nextSend==0)nextSend=now+PublishInterval;
                else{
                    nextSend+=PublishInterval;
                    if(nextSend<=now){if(timing)skippedPublications+=(int)Math.Floor((now-nextSend)/PublishInterval)+1;nextSend=now+PublishInterval;}
                }
                double begin=timing?Milliseconds():0;
                foreach(var session in sessions.Values)session.Publish();
                if(timing){publicationMs.Add(Milliseconds()-begin);publications++;}
            }
            if(timing)ReportTiming(Time.realtimeSinceStartupAsDouble);
        }
        int aheadCursor;
        void FixedUpdate(){if(!disconnected)foreach(var session in sessions.Values)session.StepLive();}
        void OnDestroy(){disconnected=true;socket?.Close();}
    }
}
#endif
