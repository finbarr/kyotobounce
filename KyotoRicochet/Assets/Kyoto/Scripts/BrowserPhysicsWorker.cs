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
            public Vector3 spawn;public float radius;
        }
        readonly ConcurrentQueue<BrowserSession.Command> commands=new ConcurrentQueue<BrowserSession.Command>();
        readonly Dictionary<string,BrowserSession> sessions=new Dictionary<string,BrowserSession>();
        TcpClient socket;StreamWriter output;Thread reader;
        volatile bool disconnected;
        StationLayout layout;string hash;double nextSend;
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
                    {if(line.Length>8192)break;commands.Enqueue(JsonUtility.FromJson<BrowserSession.Command>(line));}
                }
            }
            catch(Exception){}
            disconnected=true;
        }
        void Send(object data){try{output?.WriteLine(JsonUtility.ToJson(data));}catch(IOException){disconnected=true;}}
        void Update()
        {
            if(disconnected){Application.Quit();return;}
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
            if(Time.realtimeSinceStartupAsDouble>=nextSend)
            {nextSend=Time.realtimeSinceStartupAsDouble+1.0/30;foreach(var session in sessions.Values)session.Publish();}
        }
        void FixedUpdate(){if(!disconnected)foreach(var session in sessions.Values)session.Step();}
        void OnDestroy(){disconnected=true;socket?.Close();}
    }
}
#endif
