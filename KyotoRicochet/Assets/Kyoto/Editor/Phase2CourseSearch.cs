using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using UnityEditor;
using UnityEngine;

namespace Kyoto.Editor
{
    // Author with the shipped contact/cup model, then retain independently
    // perturbed throws. No synthetic cup attraction or special bounce force.
    public static class Phase2CourseSearch
    {
        [Serializable] public class Seed
        {
            public Challenge challenge;
            public float yaw,pitch,speed,top,kick,floor;
            public float phase,cupOffsetSearch;
            public Vector2 cupMin,cupMax;
            public int variants=180;
        }
        [Serializable] public class Seeds {public Seed[] seeds;}
        [Serializable] public class Result
        {
            public string id,status,layoutSha256,baselineLayoutSha256;
            public Challenge challenge;
            public int variantsTried,candidatesTried,neighboursPassed,neighboursTotal;
            public List<Trial> neighbours=new List<Trial>();
            public List<Trial> timing=new List<Trial>();
            public List<Trial> timingValidation=new List<Trial>();
        }
        [Serializable] public class Trial
        {
            public string label;
            public float yaw,pitch,speed,top,kick,time;
            public Vector3 feet;
            public bool captured,qualified;
            public int bounces,surfaces,budgetExhaustions;
            public string[] surfaceIds;
            public Vector3 finalPosition;
        }
        struct Settings {public float yaw,pitch,speed,top,kick,time;public Vector3 feet;}
        static ShotSimulation sim;
        static StationLayout searchLayout;
        static string output,layoutHash;
        static readonly List<string> searchLog=new List<string>();
        static Vector3 Origin(Settings s)=>s.feet+Vector3.up*1.5f+Quaternion.Euler(0,s.yaw,0)*new Vector3(.22f,0,.42f);
        static Vector3 Velocity(Settings s)=>Quaternion.Euler(-s.pitch,s.yaw,0)*Vector3.forward*s.speed;
        static Vector3 Spin(Settings s)=>SpinControls.Compose(s.yaw,s.top,s.kick,0);
        static bool ReleaseClear(Settings s)
        {
            var p=Origin(s);float r=sim.Ball.Profile.radius_m;
            var hits=new Collider[8];
            return sim.Physics.OverlapSphere(p,r+.004f,hits,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)==0;
        }
        public static void VerifyRetainedTrials(string destination,bool writeCandidate=false,string candidatePath=null)
        {
            string baseline=null,coursePath=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-course-baseline="))baseline=arg.Substring("--kyoto-course-baseline=".Length);
                if(arg.StartsWith("--kyoto-course-candidate="))coursePath=arg.Substring("--kyoto-course-candidate=".Length);
            }
            if(baseline==null)throw new ArgumentException("Retained course verification requires --kyoto-course-baseline.");
            Directory.CreateDirectory(destination);int failed=0;var report=new List<string>();
            var course=AssetDatabase.LoadAssetAtPath<Course>("Assets/Kyoto/Phase2/Course.asset");
            if(!course||course.challenges.Length!=8)throw new Exception("Missing installed eight-course asset.");
            if(coursePath!=null)
            {
                var selected=ScriptableObject.CreateInstance<Course>();JsonUtility.FromJsonOverwrite(File.ReadAllText(coursePath),selected);
                if(selected.challenges==null||!selected.challenges.Select(c=>c.id).SequenceEqual(course.challenges.Select(c=>c.id)))
                    throw new Exception("Candidate must preserve the ordered eight challenge identities.");
                course=selected;
            }
            string layoutText=candidatePath==null?Resources.Load<TextAsset>("StationLayout").text:File.ReadAllText(candidatePath);
            var testedLayout=JsonUtility.FromJson<StationLayout>(layoutText);
            if(testedLayout.schemaVersion!=1||testedLayout.units!="meters")throw new InvalidOperationException("Unsupported candidate layout schema or units.");
            string testedHash;
            using(var sha=SHA256.Create())testedHash=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(layoutText))).Replace("-","").ToLowerInvariant();
            if(coursePath!=null&&course.layoutSha256!=testedHash)throw new Exception("Explicit course candidate is not bound to the tested layout.");
            if(testedHash!=course.layoutSha256&&!writeCandidate)throw new Exception("Layout changed; explicitly revalidate the course before ordinary regression testing.");
            using(sim=new ShotSimulation(true,testedLayout,BallProfile.Phase2Default))
            foreach(var c in course.challenges)
            {
                string name=c.id+"-result.json",text=File.ReadAllText(Path.Combine(baseline,name));
                File.WriteAllText(Path.Combine(destination,"baseline-"+name),text);
                var old=JsonUtility.FromJson<Result>(text);
                if(JsonUtility.ToJson(old.challenge)!=JsonUtility.ToJson(c))
                    throw new Exception("Retained trial does not describe the selected course: "+c.id);
                sim.SetCup(c.cup,c.cupRadius);var current=new Result{id=c.id,challenge=c,layoutSha256=testedHash,baselineLayoutSha256=old.layoutSha256,status="PASS"};
                void Replay(List<Trial> source,List<Trial> target,bool positive,string group)
                {
                    foreach(var t in source)
                    {
                        var s=new Settings{feet=t.feet,yaw=t.yaw,pitch=t.pitch,speed=t.speed,top=t.top,kick=t.kick,time=t.time};
                        var now=Throw(c,s,t.label);target.Add(now);
                        bool ok=now.budgetExhaustions==0&&(positive?now.qualified:now.qualified==t.qualified);
                        string line=(ok?"PASS ":"FAIL ")+c.id+" "+group+" "+t.label+" captured="+now.captured+" qualified="+now.qualified;
                        report.Add(line);if(!ok){failed++;current.status="FAIL";Debug.LogError(line);}
                    }
                }
                Replay(old.neighbours,current.neighbours,true,"neighbour");
                Replay(old.timingValidation,current.timingValidation,true,"timing-window");
                Replay(old.timing,current.timing,false,"coarse-phase-classification");
                File.WriteAllText(Path.Combine(destination,name),JsonUtility.ToJson(current,true));
            }
            File.WriteAllLines(Path.Combine(destination,"verification.txt"),report);
            Debug.Log($"Retained course trials: {report.Count-failed} PASS, {failed} FAIL");
            if(failed>0)throw new Exception(failed+" retained course trials failed.");
            if(writeCandidate)
            {
                var candidate=UnityEngine.Object.Instantiate(course);candidate.layoutSha256=testedHash;
                File.WriteAllText(Path.Combine(destination,"course-candidate.json"),JsonUtility.ToJson(candidate,true));
                UnityEngine.Object.DestroyImmediate(candidate);
            }
            if(coursePath!=null)UnityEngine.Object.DestroyImmediate(course);
        }
        public static void Run()
        {
            output=Path.GetFullPath("../artifacts/phase2/courses/search-01");string only="",seedPath="../art-source/phase2-course-seeds.json",candidatePath=null;
            foreach(var arg in Environment.GetCommandLineArgs())
            {
                if(arg.StartsWith("--kyoto-course-output="))output=arg.Substring("--kyoto-course-output=".Length);
                if(arg.StartsWith("--kyoto-course-only="))only=arg.Substring("--kyoto-course-only=".Length);
                if(arg.StartsWith("--kyoto-course-seeds="))seedPath=arg.Substring("--kyoto-course-seeds=".Length);
                if(arg.StartsWith("--kyoto-layout-candidate="))candidatePath=arg.Substring("--kyoto-layout-candidate=".Length);
            }
            Directory.CreateDirectory(output);
            var seedText=File.ReadAllText(seedPath);
            File.WriteAllText(Path.Combine(output,"seeds-used.json"),seedText);
            var seeds=JsonUtility.FromJson<Seeds>(seedText).seeds;
            var text=candidatePath==null?Resources.Load<TextAsset>("StationLayout").text:File.ReadAllText(candidatePath);
            searchLayout=JsonUtility.FromJson<StationLayout>(text);
            if(searchLayout.schemaVersion!=1||searchLayout.units!="meters")throw new InvalidOperationException("Unsupported search layout schema or units.");
            using(var sha=SHA256.Create())layoutHash=BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(text))).Replace("-","").ToLowerInvariant();
            File.WriteAllText(Path.Combine(output,"layout-sha256.txt"),layoutHash+"\n");
            Physics.gravity=Vector3.down*9.81f;Physics.defaultContactOffset=.001f;
            searchLog.Clear();var results=new List<Result>();
            using(sim=new ShotSimulation(true,searchLayout,BallProfile.Phase2Default))
                foreach(var seed in seeds)
                    if(only==""||seed.challenge.id==only)results.Add(Search(seed));
            // Candidate data remains separate until every challenge and its
            // neighbourhood pass. Failed searches never replace the game asset.
            if(results.Count==8&&results.All(r=>r.status=="PASS"))
            {
                var course=ScriptableObject.CreateInstance<Course>();course.challenges=results.Select(r=>r.challenge).ToArray();course.layoutSha256=layoutHash;
                File.WriteAllText(Path.Combine(output,"course-candidate.json"),JsonUtility.ToJson(course,true));
                UnityEngine.Object.DestroyImmediate(course);
            }
            File.WriteAllLines(Path.Combine(output,"search.log"),searchLog);
            if(results.Any(r=>r.status!="PASS"))throw new Exception("Some course searches remain unsolved; retained candidate diagnostics at "+output);
        }
        static void Log(string line){searchLog.Add(line);File.AppendAllText(Path.Combine(output,"progress.log"),line+"\n");Debug.Log(line);}
        static Result Search(Seed seed)
        {
            var c=seed.challenge;var result=new Result{id=c.id,layoutSha256=layoutHash,status="UNSOLVED",challenge=c};
            var random=new System.Random(4901+Array.IndexOf(new[]{"first-bank","return","left-kick","right-kick","wall-transfer","stair-bank","many-surfaces","escalator-clock"},c.id));
            float period=0;
            if(!string.IsNullOrEmpty(c.timingLaneId))
            {
                var lane=Array.Find(searchLayout.escalators,e=>e.id==c.timingLaneId);
                if(lane==null||lane.speed==0)throw new Exception("Missing operating timing lane "+c.timingLaneId);
                double length=0;for(int i=1;i<lane.path.Length;i++)length+=Vector3.Distance(lane.path[i-1],lane.path[i]);
                period=(float)(length/lane.stepCount/Math.Abs(lane.speed));c.timingPeriod=period;
                Diagnose(seed);
            }
            for(int variant=0;variant<seed.variants;variant++)
            {
                result.variantsTried++;
                float Sym()=>((float)random.NextDouble()*2-1);
                var s=new Settings{feet=c.launchFeet,yaw=seed.yaw,pitch=seed.pitch,speed=seed.speed,top=seed.top,kick=seed.kick};
                if(variant>0)
                {
                    s.yaw+=Sym()*(c.aimHalfAngle<15?Mathf.Min(2,c.aimHalfAngle*.5f):6);
                    s.pitch=Mathf.Clamp(s.pitch+Sym()*14,-60,75);s.speed=Mathf.Clamp(s.speed*(1+Sym()*.45f),.5f,16);
                    s.top*=1+Sym()*.2f;s.kick*=1+Sym()*.2f;
                    // Leave room for the independent +2.5% spin perturbation.
                    var bounded=Vector2.ClampMagnitude(new Vector2(s.top,s.kick),SpinControls.MaximumSpin/1.025f);s.top=bounded.x;s.kick=bounded.y;
                }
                s.time=period==0?0:variant==0?seed.phase:(float)random.NextDouble()*period;
                sim.RemoveCup();if(!ReleaseClear(s))continue;
                var targets=Targets(seed,s);
                foreach(var target in targets)
                {
                    result.candidatesTried++;c.cup=target;sim.SetCup(target,c.cupRadius);
                    var trial=Throw(c,s,"candidate");
                    if(!trial.qualified)continue;
                    var neighbours=Neighbours(c,s);
                    int passed=neighbours.Count(t=>t.qualified);
                    if(passed>result.neighboursPassed)
                    {
                        result.neighbours=neighbours;result.neighboursPassed=passed;result.neighboursTotal=neighbours.Count;
                        StoreWitness(c,s);Save(result,"best");
                        Log($"{c.id} candidate {variant}: neighbours {passed}/{neighbours.Count}, cup={target:F3}");
                    }
                    if(passed!=neighbours.Count)continue;
                    var timing=new List<Trial>();var timingValidation=new List<Trial>();var timingDebug=new List<Trial>();bool timingPass=true;
                    if(period>0)
                    {
                        const int samples=80;
                        for(int j=0;j<samples;j++){var q=s;q.time=j*period/samples;timing.Add(Throw(c,q,"phase-"+j));}
                        int successes=timing.Count(t=>t.qualified);
                        // Endpoint successes alone can conceal failures in the
                        // middle. Locate a contiguous coarse run, then check an
                        // 80 ms window at 1 ms spacing and recheck aim at its center.
                        timingPass=false;
                        for(int startIndex=0;startIndex<samples&&successes<=64;startIndex++)
                        {
                            if(!timing[startIndex].qualified||timing[(startIndex+samples-1)%samples].qualified)continue;
                            int count=0;while(count<samples&&timing[(startIndex+count)%samples].qualified)count++;
                            if((count-1)*period/samples<.09f)continue;
                            float low=startIndex*period/samples,high=(startIndex+count-1)*period/samples;
                            float original=s.time;while(original<low)original+=period;while(original>high)original-=period;
                            // The geometric midpoint need not have the best aim
                            // neighbourhood. Retain the known robust phase as
                            // the first candidate, then sample other interior centers.
                            var centers=new List<float>{original,(low+high)*.5f};
                            for(float t=low+.045f;t<=high-.04f;t+=.015f)centers.Add(t);
                            foreach(float time in centers)
                            {
                                if(time<low+.04f||time>high-.04f)continue;
                                var center=s;center.time=time;
                                var centeredNeighbours=Neighbours(c,center);timingDebug.AddRange(centeredNeighbours);
                                if(centeredNeighbours.Any(t=>!t.qualified))continue;
                                var checks=new List<Trial>();
                                for(int j=-40;j<=40;j++){var q=center;q.time+=j*.001f;checks.Add(Throw(c,q,"window-ms-"+j));}
                                foreach(int cycle in new[]{1,7,100}){var q=center;q.time+=cycle*period;checks.Add(Throw(c,q,"repeat-cycle-"+cycle));}
                                timingDebug.AddRange(checks);if(checks.Any(t=>!t.qualified))continue;
                                s=center;neighbours=centeredNeighbours;passed=neighbours.Count;
                                timingValidation=checks;c.timingWindowStart=s.time-.04f;c.timingWindowEnd=s.time+.04f;timingPass=true;break;
                            }
                            if(timingPass)break;
                        }
                    }
                    if(!timingPass)
                    {
                        StoreWitness(c,s);
                        var rejected=new Result{id=c.id,status="REJECTED_TIMING_WINDOW",layoutSha256=layoutHash,challenge=c,neighbours=neighbours,timing=timing,timingValidation=timingDebug};
                        Save(rejected,"timing-"+variant+"-"+result.candidatesTried);
                        Log(c.id+" robust aim but no useful timing window");continue;
                    }
                    StoreWitness(c,s);result.status="PASS";result.neighbours=neighbours;result.neighboursPassed=passed;result.neighboursTotal=neighbours.Count;result.timing=timing;result.timingValidation=timingValidation;
                    Save(result,"result");WriteWitness(c,s);
                    Log($"SOLVED {c.id}: {passed}/{neighbours.Count} neighbours, phase={s.time:R}, cup={c.cup:F5}");return result;
                }
                if(variant%30==0)Log($"SEARCH {c.id}: {variant}/{seed.variants}, cup candidates={result.candidatesTried}");
            }
            Save(result,"result");Log($"UNSOLVED {c.id}: best {result.neighboursPassed}/{result.neighboursTotal}, candidates={result.candidatesTried}");return result;
        }
        static void StoreWitness(Challenge c,Settings s)
        {c.origin=Origin(s);c.witnessVelocity=Velocity(s);c.witnessSpin=Spin(s);c.witnessWorldTime=s.time;}
        static void Save(Result r,string suffix)=>File.WriteAllText(Path.Combine(output,r.id+"-"+suffix+".json"),JsonUtility.ToJson(r,true));
        static void Diagnose(Seed seed)
        {
            sim.RemoveCup();
            foreach(float speed in new[]{1.7f,2.5f,3.3f})
            {
                var s=new Settings{feet=seed.challenge.launchFeet,yaw=seed.yaw,pitch=seed.pitch,speed=speed,top=seed.top,kick=seed.kick,time=.4f};
                var contacts=new List<string>();var trace=new List<string>{"seconds,x,y,z,vx,vy,vz"};
                Action<ContactSample> hit=q=>contacts.Add(JsonUtility.ToJson(q));sim.Ball.Contact+=hit;
                sim.Run(Origin(s),Velocity(s),Spin(s),18,sample:b=>{var p=b.Body.position;var v=b.Velocity;trace.Add(FormattableString.Invariant($"{b.Clock:R},{p.x:R},{p.y:R},{p.z:R},{v.x:R},{v.y:R},{v.z:R}"));},startWorldTime:s.time);
                sim.Ball.Contact-=hit;
                File.WriteAllLines(Path.Combine(output,"diagnostic-"+speed.ToString("F1",System.Globalization.CultureInfo.InvariantCulture)+"-contacts.jsonl"),contacts);
                File.WriteAllLines(Path.Combine(output,"diagnostic-"+speed.ToString("F1",System.Globalization.CultureInfo.InvariantCulture)+"-trace.csv"),trace);
            }
        }
        static List<Vector3> Targets(Seed seed,Settings s)
        {
            var score=new ShotScore();var ids=new HashSet<string>();var candidates=new List<Vector3>();Vector3 previous=Origin(s);
            Action<Surface,Vector3,float> impact=(surface,point,speed)=>{if(score.Register(surface,speed,sim.Ball.Clock))ids.Add(surface.surfaceId);};
            sim.Ball.Impact+=impact;
            sim.Run(previous,Velocity(s),Spin(s),18,sample:b=>
            {
                var p=b.Body.position;float mouth=seed.floor+CupCapture.Height;
                if(previous.y>=mouth&&p.y<mouth&&b.Velocity.y<0&&score.Bounces>=seed.challenge.requiredBounces&&score.Unique>=seed.challenge.requiredSurfaces&&HasRequired(seed.challenge,ids))
                {
                    var target=Vector3.Lerp(previous,p,(previous.y-mouth)/(previous.y-p.y));target.y=seed.floor;
                    if(target.x>=seed.cupMin.x&&target.x<=seed.cupMax.x&&target.z>=seed.cupMin.y&&target.z<=seed.cupMax.y&&
                        Vector2.Distance(new Vector2(target.x,target.z),new Vector2(s.feet.x,s.feet.z))>1)
                    {
                        foreach(float dx in seed.cupOffsetSearch>0?new[]{0,-seed.cupOffsetSearch,seed.cupOffsetSearch}:new[]{0f})
                        foreach(float dz in seed.cupOffsetSearch>0?new[]{0,-seed.cupOffsetSearch,seed.cupOffsetSearch}:new[]{0f})
                        {
                            var q=target+new Vector3(dx,0,dz);
                            if(q.x>=seed.cupMin.x&&q.x<=seed.cupMax.x&&q.z>=seed.cupMin.y&&q.z<=seed.cupMax.y&&Supported(q,seed.challenge.cupRadius))candidates.Add(q);
                        }
                    }
                }
                previous=p;
            },startWorldTime:s.time);
            sim.Ball.Impact-=impact;return candidates;
        }
        static bool Supported(Vector3 p,float radius)
        {
            for(int j=0;j<9;j++)
            {
                var q=p;if(j>0){float a=j*Mathf.PI/4;q+=new Vector3(Mathf.Cos(a),0,Mathf.Sin(a))*(radius+.035f);}
                if(!sim.Physics.Raycast(q+Vector3.up*.04f,Vector3.down,out var hit,.08f,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)||
                    hit.collider.gameObject.layer==CollisionLayers.MovingSteps||hit.normal.y<.995f||Mathf.Abs(hit.point.y-p.y)>.004f)return false;
            }
            var hits=new Collider[8];return sim.Physics.OverlapBox(p+Vector3.up*.105f,new Vector3(radius+.02f,.085f,radius+.02f),hits,Quaternion.identity,CollisionLayers.BallMask,QueryTriggerInteraction.Ignore)==0;
        }
        static bool HasRequired(Challenge c,HashSet<string> ids)=>
            (string.IsNullOrEmpty(c.requiredSurfaceId)||ids.Contains(c.requiredSurfaceId))&&
            (string.IsNullOrEmpty(c.requiredSurfacePrefix)||ids.Any(id=>id.StartsWith(c.requiredSurfacePrefix,StringComparison.Ordinal)));
        static Trial Throw(Challenge c,Settings s,string label,List<string> trace=null)
        {
            var score=new ShotScore();var ids=new HashSet<string>();var capture=new CupCapture{Base=c.cup,InnerRadius=c.cupRadius,BallRadius=sim.Ball.Profile.radius_m};capture.Reset(Origin(s));
            Action<Surface,Vector3,float> impact=(surface,point,speed)=>{if(score.Register(surface,speed,sim.Ball.Clock))ids.Add(surface.surfaceId);};
            sim.Ball.Impact+=impact;
            bool qualified=false;int bounces=0,surfaces=0;
            sim.Run(Origin(s),Velocity(s),Spin(s),18,sample:b=>
            {
                if(capture.Step(b.Body.position,b.Velocity,BallBody.Step)){qualified=score.Bounces>=c.requiredBounces&&score.Unique>=c.requiredSurfaces&&HasRequired(c,ids);bounces=score.Bounces;surfaces=score.Unique;}
                if(trace!=null){var p=b.Body.position;var q=b.Body.rotation;trace.Add(FormattableString.Invariant($"{b.Clock:R},{s.time+b.Clock:R},{p.x:R},{p.y:R},{p.z:R},{q.x:R},{q.y:R},{q.z:R},{q.w:R},{capture.Captured}"));}
            },startWorldTime:s.time);
            sim.Ball.Impact-=impact;
            return new Trial{label=label,yaw=s.yaw,pitch=s.pitch,speed=s.speed,top=s.top,kick=s.kick,time=s.time,feet=s.feet,
                captured=capture.Captured,qualified=qualified&&sim.Ball.ContactBudgetExhaustions==0,bounces=bounces,surfaces=surfaces,
                surfaceIds=ids.ToArray(),budgetExhaustions=sim.Ball.ContactBudgetExhaustions,finalPosition=sim.Ball.Body.position};
        }
        static List<Trial> Neighbours(Challenge c,Settings s)
        {
            var trials=new List<Trial>{Throw(c,s,"center")};
            foreach(int sign in new[]{-1,1})
            {
                var q=s;q.yaw+=sign*.2f;trials.Add(Throw(c,q,"yaw"+sign));q=s;q.pitch+=sign*.2f;trials.Add(Throw(c,q,"pitch"+sign));
                q=s;q.speed*=1+sign*.01f;trials.Add(Throw(c,q,"speed"+sign));
                if(s.top!=0){q=s;q.top*=1+sign*.025f;trials.Add(Throw(c,q,"top"+sign));}
                if(s.kick!=0){q=s;q.kick*=1+sign*.025f;trials.Add(Throw(c,q,"kick"+sign));}
                q=s;q.feet.x+=sign*.02f;trials.Add(Throw(c,q,"feet-x"+sign));q=s;q.feet.z+=sign*.02f;trials.Add(Throw(c,q,"feet-z"+sign));
            }
            // Combined perturbations are separate from one-axis sensitivities.
            foreach(int a in new[]{-1,1})foreach(int b in new[]{-1,1})foreach(int d in new[]{-1,1})
            {var q=s;q.yaw+=a*.1f;q.pitch+=b*.1f;q.speed*=1+d*.005f;trials.Add(Throw(c,q,"combined"+a+b+d));}
            return trials;
        }
        static void WriteWitness(Challenge c,Settings s)
        {
            var trace=new List<string>{"seconds,station_seconds,x,y,z,qx,qy,qz,qw,captured"};var result=Throw(c,s,"witness",trace);
            if(!result.qualified)throw new Exception("Witness was not reproducible: "+c.id);
            File.WriteAllLines(Path.Combine(output,c.id+"-witness.csv"),trace);
        }
    }
}
