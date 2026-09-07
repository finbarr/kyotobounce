using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Kyoto
{
    public enum GamePhase { Title, Aim, Flight, Success, Miss, Replay, Complete }
    public enum ViewMode { Ride, Tumble, Observer }

    public class GameController : MonoBehaviour
    {
        public Course course;
        public bool phase2Layout;
        public TextAsset layoutOverride;
        public TextAsset LayoutSource=>layoutOverride?layoutOverride:Resources.Load<TextAsset>("StationLayout");
        public bool FreeExploration=true;
        public float LookSensitivity=.065f;
        public FirstPersonWalker Walker {get;private set;}
        public StationLayout Layout {get;private set;}
        public string LayoutSha256 {get;private set;}
        public bool UIHasFocus {get;set;}
        public Vector3 ReleasePosition {get;private set;}
        public Vector3 ShotOrigin {get;private set;}
        public bool ReleaseClear {get;private set;}=true;
        public Material ballMaterial, ceramicMaterial, accentMaterial, lineMaterial;
        public Camera view;
        public GamePhase Phase { get; private set; } = GamePhase.Title;
        public ViewMode Mode { get; private set; } = ViewMode.Ride;
        public BallBody Ball { get; private set; }
        public ShotScore Score { get; } = new ShotScore();
        public int Index { get; private set; }
        public int Banked { get; private set; }
        public int Attempts { get; private set; }
        public int Best { get; private set; }
        public float Yaw = 0, Pitch = 20, Speed = 5, Spin = 0, SideSpin = 0, VerticalSpin = 0;
        public double ShotWorldTime {get;private set;}
        double replayRestoreWorldTime;
        public float FlightTime { get; private set; }
        public string Notice { get; private set; } = "";
        public float NoticeUntil { get; private set; }
        public float FadeUntil { get; private set; }
        readonly Challenge exploration=new Challenge{id="exploration",title="Explore the station",subtitle="Walk · climb · throw from your hand",origin=new Vector3(0,1.5f,20),cup=new Vector3(-6,0,12),cupRadius=.14f,witnessVelocity=new Vector3(0,1,-2)};
        public Challenge Level => phase2Layout&&FreeExploration?exploration:course.challenges[Index];
        public bool HasAuthoredCourse=>phase2Layout&&course.layoutSha256==LayoutSha256&&course.challenges.Length==8&&Array.TrueForAll(course.challenges,c=>c.walkingLaunch);
        public bool InChallenge=>phase2Layout&&!FreeExploration&&Level.walkingLaunch;
        public Vector3 LaunchVelocity => Quaternion.Euler(-Pitch,Yaw,0)*Vector3.forward*Speed;
        public Vector3 LaunchSpin => SpinControls.Compose(Yaw,Spin,SideSpin,VerticalSpin);
        public IReadOnlyList<PoseSample> Recording => recording;
        public bool Guide = true, Muted, Vignette = true, Charging;
        public float FrameMilliseconds { get; private set; }
        public Vector3 ObserverPosition => phase2Layout?(Phase==GamePhase.Aim?Walker.Eye:observerAnchor):Level.origin + new Vector3(0,.14f,0) - Quaternion.Euler(0,Yaw,0)*Vector3.forward*.5f;
        public float TotalFlightDistance { get; private set; }
        public Vector3 CupPosition => Level.cup;
        readonly List<PoseSample> recording = new List<PoseSample>();
        readonly List<Vector3> trail = new List<Vector3>();
        ShotSimulation prediction;
        CupCapture capture;
        GameObject cup, visual;
        LineRenderer previewLine, trailLine, cupRing,launchMarker,launchArrow;
        FlightCamera flightCamera;
        ImpactAudio impactAudio;
        float previewDue, lastPreviewYaw=999, lastPreviewPitch, lastPreviewSpeed, lastPreviewSpin, lastPreviewSide,lastPreviewVertical;
        float replayTime, chargeStart, quietTime, autoReplayAt=-1;
        GamePhase replayReturn;
        bool booted;
        Vector3 observerAnchor,lastPreviewOrigin;
        int[] earned;
        public bool Automation {get;private set;}
        public void BeginVerification(){Automation=true;}

        void Awake()
        {
            Time.fixedDeltaTime=BallBody.Step;
            Time.maximumDeltaTime=.1f;
            Physics.gravity=new Vector3(0,-9.81f,0);
            Physics.bounceThreshold=.15f;
            Physics.defaultContactOffset=.001f;
            Application.targetFrameRate=60;
            QualitySettings.vSyncCount=1;
            Best=PlayerPrefs.GetInt("KyotoBest",0);
            var geometry=new GameObject("Physical station");
            if(phase2Layout)
            {
                var source=LayoutSource;
                Layout=StationLayout.Load(source);
                using(var hash=System.Security.Cryptography.SHA256.Create())LayoutSha256=BitConverter.ToString(hash.ComputeHash(System.Text.Encoding.UTF8.GetBytes(source.text))).Replace("-","").ToLowerInvariant();
                StationWorld.Create(geometry.transform,Layout);
                Walker=new GameObject("Walking player").AddComponent<FirstPersonWalker>();Walker.Place(Layout.spawn+Vector3.up*.03f);
                observerAnchor=Walker.Eye;
            }
            else StationGeometry.Create(geometry.transform);
            var obj=new GameObject("Rubber ball");obj.AddComponent<SphereCollider>();obj.AddComponent<Rigidbody>();
            Ball=obj.AddComponent<BallBody>();
            visual=GameObject.CreatePrimitive(PrimitiveType.Sphere);visual.name="Striped rubber";
            // Destroy is deferred until the end of the frame. Disable the
            // decorative primitive immediately so startup throws cannot hit it.
            var visualCollider=visual.GetComponent<Collider>();visualCollider.enabled=false;Destroy(visualCollider);
            visual.transform.SetParent(obj.transform,false);visual.transform.localScale=Vector3.one*.05f;
            visual.GetComponent<Renderer>().sharedMaterial=ballMaterial;
            var stripe=new GameObject("Asymmetric spin stripe");stripe.transform.SetParent(obj.transform,false);
            stripe.transform.localRotation=Quaternion.Euler(28,15,7);
            stripe.AddComponent<MeshFilter>().sharedMesh=StationGeometry.RingMesh(.0253f,.0015f);
            stripe.AddComponent<MeshRenderer>().sharedMaterial=accentMaterial;
            if(phase2Layout)Ball.SetProfile(BallProfile.Phase2Default);
            previewLine=MakeLine("Practice trajectory",.012f,new Color(.5f,.87f,.87f,.65f));
            trailLine=MakeLine("Flight trace",.006f,new Color(1,.58f,.25f,.8f));
            cupRing=MakeLine("Cup beacon",.012f,new Color(.98f,.68f,.33f));
            cupRing.loop=true;cupRing.positionCount=96;
            launchMarker=MakeLine("Launch area",.018f,new Color(1,.66f,.32f,.8f));launchMarker.loop=true;
            launchArrow=MakeLine("Launch direction",.018f,new Color(1,.66f,.32f,.8f));
            prediction=new ShotSimulation(true,Layout,Ball.Profile);
            flightCamera=gameObject.AddComponent<FlightCamera>();flightCamera.game=this;flightCamera.view=view;
            impactAudio=gameObject.AddComponent<ImpactAudio>();impactAudio.game=this;
            Ball.Impact += OnImpact;
            LoadLevel(0,false);
            booted=true;
            Automation=Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-smoke");
            if(Automation)gameObject.AddComponent<RuntimeSmoke>();
        }
        LineRenderer MakeLine(string name,float width,Color color)
        {
            var line=new GameObject(name).AddComponent<LineRenderer>();line.sharedMaterial=lineMaterial;
            line.widthMultiplier=width;line.startColor=line.endColor=color;line.numCornerVertices=3;line.numCapVertices=3;
            line.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;line.receiveShadows=false;return line;
        }
        void OnDestroy(){prediction?.Dispose();}
        public void Begin(){Banked=0;Attempts=0;earned=new int[course.challenges.Length];LoadLevel(0,true);}
        public void StartChallenges(){if(!HasAuthoredCourse)return;FreeExploration=false;Begin();}
        public void Explore(){FreeExploration=true;Begin();}
        public void ReturnToLaunch(){if(!InChallenge)return;Walker.Place(Level.launchFeet);Retry();}
        public void LoadLevel(int index,bool aim=true)
        {
            Index=index;
            if(phase2Layout&&!FreeExploration)Walker.Place(Level.walkingLaunch?Level.launchFeet:Level.origin-Vector3.up*1.5f);
            if(cup){cup.SetActive(false);Destroy(cup);}
            cup=StationGeometry.CreateCup(null,Level.cup,Level.cupRadius,ceramicMaterial,accentMaterial);
            prediction.SetCup(Level.cup,Level.cupRadius);
            capture=new CupCapture{Base=Level.cup,InnerRadius=Level.cupRadius,BallRadius=Ball.Profile.radius_m};
            Coach(false);
            // Start near the solution, so the first shot teaches rather than hides the controls.
            Pitch+=2.5f;Speed*=.96f;
            ResetShot(aim?GamePhase.Aim:GamePhase.Title);
            for(int i=0;i<96;i++)
            {float a=i*Mathf.PI*2/96;cupRing.SetPosition(i,Level.cup+new Vector3(Mathf.Sin(a)*.37f,.005f,Mathf.Cos(a)*.37f));}
            launchMarker.positionCount=InChallenge?64:0;launchArrow.positionCount=InChallenge?5:0;
            if(InChallenge)
            {
                Vector3 center=Level.launchFeet-Vector3.up*.018f;
                for(int i=0;i<64;i++){float a=i*Mathf.PI*2/64;launchMarker.SetPosition(i,center+new Vector3(Mathf.Sin(a),0,Mathf.Cos(a))*Level.launchRadius);}
                var heading=Quaternion.Euler(0,Level.aimYaw,0);
                var shape=new[]{new Vector3(0,0,-.12f),new Vector3(0,0,.65f),new Vector3(-.11f,0,.49f),new Vector3(0,0,.65f),new Vector3(.11f,0,.49f)};
                for(int i=0;i<shape.Length;i++)launchArrow.SetPosition(i,center+heading*shape[i]);
            }
        }
        void ResetShot(GamePhase phase)
        {
            if(Phase==GamePhase.Replay)EndReplay();
            UpdateRelease();
            Ball.SetPose(ReleasePosition,Quaternion.identity);
            Score.Clear();capture.Reset(ReleasePosition);recording.Clear();trail.Clear();trailLine.positionCount=0;
            FlightTime=quietTime=TotalFlightDistance=0;Phase=phase;Charging=false;lastPreviewYaw=999;autoReplayAt=-1;
            SetBallVisible(true);
        }
        public void Retry(){ResetShot(GamePhase.Aim);}
        void UpdateRelease()
        {
            if(phase2Layout){ReleaseClear=Walker.TryRelease(Yaw,Pitch,out var release,Ball.Profile.radius_m);ReleasePosition=release;}
            else{ReleaseClear=true;ReleasePosition=Level.origin;}
        }
        public void Next()
        {
            if(Phase!=GamePhase.Success)return;
            if(phase2Layout&&FreeExploration){Retry();return;}
            if(Index+1<course.challenges.Length)LoadLevel(Index+1);
            else{Phase=GamePhase.Complete;SaveBest();}
        }
        public void Coach(bool notify=true)
        {
            Vector3 v=Level.witnessVelocity;Speed=v.magnitude;
            Yaw=Mathf.Atan2(v.x,v.z)*Mathf.Rad2Deg;Pitch=Mathf.Asin(v.y/v.magnitude)*Mathf.Rad2Deg;
            Vector3 local=SpinControls.Decompose(Yaw,Level.witnessSpin);Spin=local.x;SideSpin=local.y;VerticalSpin=local.z;
            if(notify)Tell(phase2Layout&&FreeExploration?"AIM RESET · gentle practice settings":"COACH · A tested line. Throw it, then make it your own.");
        }
        public void Throw()
        {
            if(Phase!=GamePhase.Aim)return;
            UpdateRelease();
            if(!ReleaseClear){Tell("MOVE CLEAR OF THE WALL · the ball needs room to leave your hand");return;}
            if(InChallenge&&!ChallengeRules.InLaunchArea(Level,Walker.transform.position))
            {Tell("RETURN TO THE LAUNCH AREA · or switch to free exploration");return;}
            if(InChallenge&&!ChallengeRules.InAimCone(Level,Yaw))
            {Tell("FOLLOW THE LAUNCH ARROW · this route begins with a forward throw");return;}
            ShotWorldTime=StationMotion.Time(gameObject.scene);
            ShotOrigin=ReleasePosition;if(phase2Layout)observerAnchor=Walker.Eye;
            Attempts++;Score.Clear();FlightTime=0;quietTime=0;recording.Clear();trail.Clear();capture.Reset(ShotOrigin);
            recording.Add(new PoseSample(ShotOrigin,Quaternion.identity,0));
            Ball.Launch(ShotOrigin,LaunchVelocity,LaunchSpin);Phase=GamePhase.Flight;
            previewLine.positionCount=0;Charging=false;flightCamera.OnLaunch();
            Debug.Log($"KYOTO_THROW level={Index+1} v={LaunchVelocity:F5} spin={LaunchSpin:F5}");
        }
        void FixedUpdate()
        {
            if(!booted)return;
            if(Phase!=GamePhase.Flight)
            {if(Phase!=GamePhase.Replay){StationMotion.Advance(gameObject.scene,Time.fixedDeltaTime);if(StationMotion.UpdatesGeometry(gameObject.scene))Physics.SyncTransforms();}return;}
            FlightTime+=Time.fixedDeltaTime;
            Ball.BeforeStep(Time.fixedDeltaTime);
            var body=Ball.Body;
            if(recording.Count>0)TotalFlightDistance+=Vector3.Distance(recording[recording.Count-1].position,body.position);
            recording.Add(new PoseSample(body.position,body.rotation,FlightTime));
            if(capture.Step(body.position,Ball.Velocity,Time.fixedDeltaTime))
            {
                if(ChallengeRules.Qualifies(Level,Score))
                {
                    if(earned==null)earned=new int[course.challenges.Length];
                    if(!phase2Layout||!FreeExploration){Banked+=Mathf.Max(0,Score.Points-earned[Index]);earned[Index]=Mathf.Max(earned[Index],Score.Points);}
                    Phase=GamePhase.Success;SaveBest();impactAudio.Success();autoReplayAt=Time.time+1.5f;
                    Tell("IN THE CUP · "+Score.Points+" points banked");
                    Debug.Log($"KYOTO_CAPTURE level={Index+1} bounces={Score.Bounces} surfaces={Score.Unique} points={Score.Points}");
                }
                else{Phase=GamePhase.Miss;Tell("IN THE CUP · include the route's required banks and surfaces");}
                SaveRecording();return;
            }
            quietTime=Ball.Velocity.sqrMagnitude<.005f?quietTime+Time.fixedDeltaTime:0;
            if(FlightTime>18||body.position.y < -1||quietTime>1.2f)
            {Phase=GamePhase.Miss;Tell("SO CLOSE · R to retry, P to replay");SaveRecording();return;}
        }
        void OnImpact(Surface surface,Vector3 point,float speed)
        {
            if(Phase!=GamePhase.Flight)return;
            if(Score.Register(surface,speed,FlightTime))Tell(Score.LastSurface+" · "+Score.Bounces+" impacts / "+Score.Unique+" surfaces",1.5f);
            impactAudio.Impact(surface,point,speed);
        }
        void Update()
        {
            if(!booted)return;
            launchMarker.enabled=launchArrow.enabled=InChallenge&&Phase==GamePhase.Aim;
            FrameMilliseconds=Mathf.Lerp(FrameMilliseconds,Time.unscaledDeltaTime*1000,.04f);
            AudioListener.volume=Muted?0:.75f;
            if(!Automation&&phase2Layout&&Phase==GamePhase.Aim)MoveWalker(Time.deltaTime);
            HandleInput();
            if(Phase==GamePhase.Success && autoReplayAt>0 && Time.time>=autoReplayAt)Replay();
            if(Phase==GamePhase.Aim)
            {
                UpdateRelease();Ball.SetPose(ReleasePosition,Quaternion.identity);
                bool changed=Yaw!=lastPreviewYaw||Pitch!=lastPreviewPitch||Speed!=lastPreviewSpeed||Spin!=lastPreviewSpin||SideSpin!=lastPreviewSide||VerticalSpin!=lastPreviewVertical||Vector3.Distance(ReleasePosition,lastPreviewOrigin)>.02f||StationMotion.Active(gameObject.scene);
                if(Guide && (phase2Layout || Index<3 || Level.preview==null) && changed && Time.time>=previewDue)
                {
                    var poses=prediction.Run(ReleasePosition,LaunchVelocity,LaunchSpin,8,startWorldTime:StationMotion.Time(gameObject.scene));
                    int count=Mathf.Min(poses.Count,Index<2?480:220);
                    previewLine.positionCount=count;for(int i=0;i<count;i++)previewLine.SetPosition(i,poses[i].position);
                    lastPreviewYaw=Yaw;lastPreviewPitch=Pitch;lastPreviewSpeed=Speed;lastPreviewSpin=Spin;lastPreviewSide=SideSpin;lastPreviewVertical=VerticalSpin;lastPreviewOrigin=ReleasePosition;previewDue=Time.time+.18f;
                }
                if(!Guide||!phase2Layout&&Index>=3)previewLine.positionCount=0;
            }
            else previewLine.positionCount=0;
            if(Phase==GamePhase.Flight)
            {
                trail.Add(Ball.RenderPosition);if(trail.Count>160)trail.RemoveAt(0);
                trailLine.positionCount=trail.Count;trailLine.SetPositions(trail.ToArray());
            }
            if(Phase==GamePhase.Replay)
            {
                replayTime+=Time.deltaTime*.65f;
                StationMotion.SetTime(gameObject.scene,ShotWorldTime+Mathf.Min(replayTime,FlightTime));
                Physics.SyncTransforms();
                int a=Mathf.Min(Mathf.FloorToInt(replayTime/BallBody.Step),recording.Count-2);
                if(a>=0&&recording.Count>1)
                {
                    var p=recording[a];var q=recording[a+1];float t=Mathf.InverseLerp(p.time,q.time,replayTime);
                    Ball.SetPose(Vector3.Lerp(p.position,q.position,t),Quaternion.Slerp(p.rotation,q.rotation,t));
                }
                if(recording.Count==0||replayTime>=recording[recording.Count-1].time+1)EndReplay();
            }
        }
        void MoveWalker(float dt)
        {
            var keyboard=Keyboard.current;Vector2 input=Vector2.zero;bool fast=false;
            if(!UIHasFocus&&keyboard!=null)
            {
                input=new Vector2((keyboard.dKey.isPressed?1:0)-(keyboard.aKey.isPressed?1:0),(keyboard.wKey.isPressed?1:0)-(keyboard.sKey.isPressed?1:0));
                fast=keyboard.shiftKey.isPressed;
            }
            // Focus suppresses input, not gravity or transport by a moving bank.
            Walker.Move(input,Yaw,fast,dt);
        }
        void HandleInput()
        {
            if(Automation)return;
            var k=Keyboard.current;var m=Mouse.current;if(k==null)return;
            if(k.escapeKey.wasPressedThisFrame){if(Phase==GamePhase.Title)Application.Quit();else{if(Phase==GamePhase.Replay)EndReplay();autoReplayAt=-1;SetMode(ViewMode.Observer);FadeUntil=Time.unscaledTime+.12f;Tell("OBSERVER · viewpoint returned");}Charging=false;}
            if(UIHasFocus)return;
            if(k.tabKey.wasPressedThisFrame)SetMode((ViewMode)(((int)Mode+1)%3));
            if(k.mKey.wasPressedThisFrame)Muted=!Muted;
            if(k.vKey.wasPressedThisFrame)Vignette=!Vignette;
            if(k.enterKey.wasPressedThisFrame){if(Phase==GamePhase.Title||Phase==GamePhase.Complete){if(HasAuthoredCourse)StartChallenges();else Begin();}else if(Phase==GamePhase.Success)Next();}
            if(k.rKey.wasPressedThisFrame&&Phase!=GamePhase.Title)Retry();
            if(k.pKey.wasPressedThisFrame)Replay();
            if(Phase!=GamePhase.Aim)return;
            if(k.hKey.wasPressedThisFrame)Coach();
            if(k.gKey.wasPressedThisFrame){Guide=!Guide;lastPreviewYaw=999;}
            if(k.spaceKey.wasPressedThisFrame)Throw();
            float delta=Time.deltaTime*(k.shiftKey.isPressed?2:12);
            Yaw+=(k.rightArrowKey.isPressed?delta:0)-(k.leftArrowKey.isPressed?delta:0);
            Pitch+=(k.upArrowKey.isPressed?delta:0)-(k.downArrowKey.isPressed?delta:0);
            Spin+=(k.eKey.isPressed?1:0)*Time.deltaTime*30-(k.qKey.isPressed?1:0)*Time.deltaTime*30;
            SideSpin+=(k.cKey.isPressed?1:0)*Time.deltaTime*30-(k.zKey.isPressed?1:0)*Time.deltaTime*30;
            if(k.xKey.wasPressedThisFrame)Spin=SideSpin=VerticalSpin=0;
            if(m!=null)
            {
                if(m.rightButton.isPressed){Vector2 d=m.delta.ReadValue();Yaw+=d.x*LookSensitivity;Pitch+=d.y*LookSensitivity;}
                Speed+=m.scroll.ReadValue().y*.006f*(k.shiftKey.isPressed?.15f:1);
                if(m.leftButton.wasPressedThisFrame && GameHUD.AllowsWorldClick(this,m.position.ReadValue()))
                {Throw();}
            }
            Pitch=Mathf.Clamp(Pitch,-65,80);Speed=Mathf.Clamp(Speed,.5f,16);
            var bounded=Vector3.ClampMagnitude(new Vector3(Spin,SideSpin,VerticalSpin),SpinControls.MaximumSpin);
            Spin=bounded.x;SideSpin=bounded.y;VerticalSpin=bounded.z;
        }
        public void SetMode(ViewMode mode){Mode=mode;Tell(mode==ViewMode.Tumble?"TUMBLE · exact ball rotation · ESC returns to observer":mode.ToString().ToUpper()+" CAMERA");}
        public void Replay()
        {
            if(recording.Count<2||Phase==GamePhase.Flight||Phase==GamePhase.Replay)return;
            replayRestoreWorldTime=StationMotion.Time(gameObject.scene);
            replayReturn=Phase;Phase=GamePhase.Replay;replayTime=0;autoReplayAt=-1;Ball.Body.isKinematic=true;SetBallVisible(true);
            trailLine.positionCount=recording.Count;for(int i=0;i<recording.Count;i++)trailLine.SetPosition(i,recording[i].position);
        }
        void EndReplay()
        {StationMotion.SetTime(gameObject.scene,replayRestoreWorldTime);Physics.SyncTransforms();Phase=replayReturn;lastPreviewYaw=999;}
        public void SetBallVisible(bool visible){foreach(var r in Ball.GetComponentsInChildren<Renderer>())r.enabled=visible;}
        public void Tell(string text,float seconds=3){Notice=text;NoticeUntil=Time.time+seconds;}
        void SaveBest(){if(Automation)return;if(Banked>Best){Best=Banked;PlayerPrefs.SetInt("KyotoBest",Best);PlayerPrefs.Save();}}
        void SaveRecording()
        {
            if(Automation)return;
            try
            {
                string path=Path.Combine(Application.persistentDataPath,"last-shot.csv");
                using(var w=new StreamWriter(path))
                {w.WriteLine("seconds,station_seconds,x,y,z,qx,qy,qz,qw");foreach(var p in recording)w.WriteLine(FormattableString.Invariant($"{p.time},{ShotWorldTime+p.time},{p.position.x},{p.position.y},{p.position.z},{p.rotation.x},{p.rotation.y},{p.rotation.z},{p.rotation.w}"));}
            }
            catch(Exception ex){Debug.LogWarning("Could not save replay: "+ex.Message);}
        }
    }
}
