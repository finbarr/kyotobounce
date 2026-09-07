using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Kyoto
{
    public class PhysicsLab : MonoBehaviour
    {
        public GameController game;
        public bool Active { get; private set; }
        public bool Running { get; private set; }
        public BallBody Ball => ball;
        public ContactSample FirstContact { get; private set; }
        public float Height=1.25f, Speed=1f, TopSpin, KickSpin, VerticalSpin, Rate=1;
        public int ContactCount { get; private set; }
        GameObject root;
        BallBody ball;
        BoxCollider slab;
        Surface surface;
        LineRenderer trajectory,axis;
        readonly List<PoseSample> poses=new List<PoseSample>();
        readonly List<ContactSample> contacts=new List<ContactSample>();
        readonly string[] names={"POLISHED STONE","STEEL","RUBBER","CERAMIC"};
        readonly float[] bounce={.76f,.64f,.82f,.24f},friction={.24f,.20f,.7f,.4f};
        int material;
        float accumulator,initialEnergy,maximumEnergy,replayTime;
        bool replaying,cupTest;
        bool referenceProfile;
        Vector2 scroll;
        Vector3 previousCamera;
        Quaternion previousRotation;
        GUIStyle label,heading,small;
        string message="";
        string launchSettings="",launchProfileJson="";
        static readonly Vector3 Origin=new Vector3(1000,0,0);
        public Vector3 Release => Origin+new Vector3(0,Height,0);
        public Vector3 Spin => SpinControls.Compose(0,TopSpin,KickSpin,VerticalSpin);

        GameObject VisualBox(string name,Vector3 center,Vector3 size,Material material)
        {
            var obj=GameObject.CreatePrimitive(PrimitiveType.Cube);obj.name=name;
            Destroy(obj.GetComponent<Collider>());obj.transform.SetParent(root.transform,false);
            obj.transform.localPosition=center;obj.transform.localScale=size;obj.GetComponent<Renderer>().sharedMaterial=material;return obj;
        }
        LineRenderer Line(string name,float width,Color color)
        {
            var line=new GameObject(name).AddComponent<LineRenderer>();line.transform.SetParent(root.transform,false);
            line.sharedMaterial=game.lineMaterial;line.widthMultiplier=width;line.startColor=line.endColor=color;
            line.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;line.receiveShadows=false;
            return line;
        }
        void Create()
        {
            root=new GameObject("Measured bounce laboratory");root.transform.position=Origin;
            var floor=StationGeometry.Box(root.transform,"Interchangeable floor",new Vector3(0,-.1f,1),new Vector3(18,.2f,18),Surface.Material("Lab stone",bounce[0],friction[0]),"lab-floor","LAB FLOOR");
            slab=floor.GetComponent<BoxCollider>();surface=floor.GetComponent<Surface>();
            VisualBox("Floor",new Vector3(0,-.1f,1),new Vector3(18,.2f,18),game.accentMaterial);
            for(int n=-8;n<=8;n++)
            {
                var x=Line("Meter grid X",.006f,new Color(.35f,.55f,.58f));x.positionCount=2;x.SetPositions(new[]{Origin+new Vector3(n,.003f,-8),Origin+new Vector3(n,.003f,9)});
                var z=Line("Meter grid Z",.006f,new Color(.35f,.55f,.58f));z.positionCount=2;z.SetPositions(new[]{Origin+new Vector3(-8,.003f,n),Origin+new Vector3(8,.003f,n)});
                if(n>=0&&n<=6){var label=new GameObject("Meter "+n).AddComponent<TextMesh>();label.transform.SetParent(root.transform,false);label.transform.localPosition=new Vector3(-.35f,.012f,n);label.transform.localRotation=Quaternion.Euler(90,0,0);label.characterSize=.075f;label.fontSize=48;label.text=n+" m";label.color=Color.white;}
            }
            var wall=StationGeometry.Box(root.transform,"Wall specimen",new Vector3(5,1.5f,3),new Vector3(.2f,3,5),Surface.Material("Wall",.64f,.2f),"lab-wall","LAB WALL");
            VisualBox("Wall specimen",wall.transform.localPosition,wall.GetComponent<BoxCollider>().size,game.ceramicMaterial);
            var slope=StationGeometry.Box(root.transform,"Inclined specimen",new Vector3(-5,.75f,4),new Vector3(3,.15f,4),Surface.Material("Slope",.76f,.24f),"lab-slope","LAB SLOPE");slope.transform.localRotation=Quaternion.Euler(-20,0,0);
            VisualBox("Inclined specimen",slope.transform.localPosition,slope.GetComponent<BoxCollider>().size,game.ceramicMaterial).transform.localRotation=slope.transform.localRotation;
            var obj=new GameObject("Marked laboratory ball");obj.transform.SetParent(root.transform,false);obj.AddComponent<SphereCollider>();obj.AddComponent<Rigidbody>();ball=obj.AddComponent<BallBody>();
            var visual=GameObject.CreatePrimitive(PrimitiveType.Sphere);Destroy(visual.GetComponent<Collider>());visual.transform.SetParent(obj.transform,false);visual.transform.localScale=Vector3.one*BallBody.Radius*2;visual.GetComponent<Renderer>().sharedMaterial=game.ballMaterial;
            var mark=new GameObject("Asymmetric stripe");mark.transform.SetParent(obj.transform,false);mark.transform.localRotation=Quaternion.Euler(28,15,7);mark.AddComponent<MeshFilter>().sharedMesh=StationGeometry.RingMesh(BallBody.Radius+.0003f,.0015f);mark.AddComponent<MeshRenderer>().sharedMaterial=game.ceramicMaterial;
            StationGeometry.CreateCup(root.transform,new Vector3(2,0,1),.10f,game.ceramicMaterial,game.accentMaterial);
            trajectory=Line("Measured path",.014f,new Color(1,.6f,.24f));axis=Line("Spin axis",.015f,new Color(.5f,1,.8f));
            ball.Contact+=s=>{contacts.Add(s);ContactCount++;if(ContactCount==1)FirstContact=s;};
            if(game.phase2Layout)
            {referenceProfile=true;ball.SetProfile(BallProfile.Phase2Default);surface.useBallReferenceResponse=true;}
            root.SetActive(false);
        }
        public void Toggle()
        {
            if(!root)Create();
            Active=!Active;root.SetActive(Active);
            game.enabled=!Active;game.GetComponent<GameHUD>().enabled=!Active;game.GetComponent<FlightCamera>().enabled=!Active;
            if(Active)
            {
                previousCamera=game.view.transform.position;previousRotation=game.view.transform.rotation;
                game.view.transform.SetPositionAndRotation(Origin+new Vector3(4.8f,3.8f,-5.8f),Quaternion.LookRotation(new Vector3(-4.8f,-2.9f,7.1f)));
                Launch(false);
            }
            else {Running=replaying=false;game.view.transform.SetPositionAndRotation(previousCamera,previousRotation);}
        }
        public void Preset(int index)
        {
            Height=1.25f;Speed=1;TopSpin=KickSpin=VerticalSpin=0;
            if(index==1)TopSpin=-200;
            if(index==2)TopSpin=200;
            if(index==3)KickSpin=-200;
            if(index==4)KickSpin=200;
            if(index==5)VerticalSpin=200;
            Launch(false);
        }
        public void Launch(bool intoCup=false)
        {
            if(!ball)return;
            cupTest=intoCup;accumulator=0;ContactCount=0;contacts.Clear();poses.Clear();FirstContact=default;trajectory.positionCount=0;replaying=false;message="";
            var start=intoCup?Origin+new Vector3(2,Height,1):Release;
            ball.Launch(start,intoCup?Vector3.zero:Vector3.forward*Speed,intoCup?Vector3.zero:Spin);
            launchSettings=SettingsSnapshot();launchProfileJson=JsonUtility.ToJson(ball.Profile,true);
            poses.Add(new PoseSample(start,Quaternion.identity,0));initialEnergy=maximumEnergy=Energy();Running=true;
            axis.positionCount=Spin.sqrMagnitude>.1f?2:0;
            if(axis.positionCount>0)axis.SetPositions(new[]{start-Spin.normalized*.45f,start+Spin.normalized*.45f});
        }
        float Energy() => .5f*ball.Profile.mass_kg*ball.Velocity.sqrMagnitude+.5f*ball.Profile.Inertia*ball.AngularVelocity.sqrMagnitude+ball.Profile.mass_kg*9.81f*ball.Body.position.y;
        public void SelectReferenceProfile(bool selected)
        {
            referenceProfile=selected;ball.SetProfile(selected?BallProfile.Cross2014():BallProfile.Prototype);
            surface.useBallReferenceResponse=selected;Launch();
        }
        void Update()
        {
            if(!game||!game.Ball)return;var k=Keyboard.current;
            if(k!=null&&k.f2Key.wasPressedThisFrame){Toggle();return;}
            if(!Active)return;
            if(k!=null&&k.escapeKey.wasPressedThisFrame){Toggle();return;}
            if(k!=null&&k.spaceKey.wasPressedThisFrame)Launch();
            if(!replaying)return;
            replayTime+=Time.unscaledDeltaTime*Rate;
            int i=Mathf.Min((int)(replayTime/BallBody.Step),poses.Count-2);
            if(i<0)return;var a=poses[i];var b=poses[i+1];float t=Mathf.InverseLerp(a.time,b.time,replayTime);
            ball.SetPose(Vector3.Lerp(a.position,b.position,t),Quaternion.Slerp(a.rotation,b.rotation,t));
            if(replayTime>=poses[poses.Count-1].time)replaying=false;
        }
        void FixedUpdate()
        {
            if(!Active||!Running)return;
            accumulator+=Time.fixedDeltaTime*Rate;
            while(accumulator>=BallBody.Step&&Running)
            {
                accumulator-=BallBody.Step;ball.BeforeStep(BallBody.Step);
                poses.Add(new PoseSample(ball.Body.position,ball.Body.rotation,ball.Clock));
                maximumEnergy=Mathf.Max(maximumEnergy,Energy());
                int count=trajectory.positionCount;trajectory.positionCount=count+1;trajectory.SetPosition(count,ball.Body.position);
                if(ball.Sleeping||ball.Clock>=8||ball.Body.position.y<-1)Running=false;
            }
        }
        public void Replay()
        {
            if(poses.Count<2)return;Running=false;replayTime=0;replaying=true;ball.SetPose(poses[0].position,poses[0].rotation);
        }
        public string Export()
        {
            string dir=Path.Combine(Application.persistentDataPath,"physics-lab",DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff"));Directory.CreateDirectory(dir);
            using(var w=new StreamWriter(Path.Combine(dir,"poses.csv")))
            {w.WriteLine("time,x,y,z,qx,qy,qz,qw");foreach(var p in poses){var v=p.position-Origin;var q=p.rotation;w.WriteLine(FormattableString.Invariant($"{p.time:R},{v.x:R},{v.y:R},{v.z:R},{q.x:R},{q.y:R},{q.z:R},{q.w:R}"));}}
            using(var w=new StreamWriter(Path.Combine(dir,"contacts.csv")))
            {
                w.WriteLine("time,surface,nx,ny,nz,in_vx,in_vy,in_vz,out_vx,out_vy,out_vz,in_wx,in_wy,in_wz,out_wx,out_wy,out_wz,slip_x,slip_y,slip_z,Jn,Jtx,Jty,Jtz,energy_before,energy_after,profile,mass,inertia,deformation_Lx,deformation_Ly,deformation_Lz");
                foreach(var s in contacts){var n=s.normal;var a=s.incomingVelocity;var b=s.outgoingVelocity;var c=s.incomingSpin;var d=s.outgoingSpin;var slip=s.slip;var j=s.tangentImpulse;
                    w.WriteLine(FormattableString.Invariant($"{s.time:R},{s.surfaceId},{n.x:R},{n.y:R},{n.z:R},{a.x:R},{a.y:R},{a.z:R},{b.x:R},{b.y:R},{b.z:R},{c.x:R},{c.y:R},{c.z:R},{d.x:R},{d.y:R},{d.z:R},{slip.x:R},{slip.y:R},{slip.z:R},{s.normalImpulse:R},{j.x:R},{j.y:R},{j.z:R},{s.EnergyBefore:R},{s.EnergyAfter:R},{s.profileId},{s.mass:R},{s.inertia:R},{s.deformationAngularImpulse.x:R},{s.deformationAngularImpulse.y:R},{s.deformationAngularImpulse.z:R}"));}
            }
            File.WriteAllText(Path.Combine(dir,"settings.txt"),launchSettings);
            File.WriteAllText(Path.Combine(dir,"ball-profile.json"),launchProfileJson);
            File.WriteAllText(Path.Combine(dir,"runtime.txt"),$"Unity {Application.unityVersion}\nPlayer {Application.version}\n{SystemInfo.operatingSystem}\n{SystemInfo.graphicsDeviceName}\n{Screen.width} x {Screen.height}\n");
            message="Saved locally to physics-lab/"+Path.GetFileName(dir);
            ScreenCapture.CaptureScreenshot(Path.Combine(dir,"capture.png"));
            return dir;
        }
        string SettingsSnapshot()
        {
            var pair=ball.Profile.response;
            return FormattableString.Invariant($"Settings captured at release; station coefficients remain provisional.\nprofile={ball.Profile.id}\nstatus={ball.Profile.status}\nradius={ball.Profile.radius_m}m mass={ball.Profile.mass_kg}kg inertia={ball.Profile.Inertia}kg*m2\nheight={Height}m speed={(cupTest?0:Speed)}m/s top={(cupTest?0:TopSpin)} kick={(cupTest?0:KickSpin)} vertical={(cupTest?0:VerticalSpin)}rad/s\nmaterial={(referenceProfile?"P5 polished granite":names[material])} normalCOR={(referenceProfile?pair.normal_restitution:bounce[material])} friction={(referenceProfile?pair.sliding_friction:friction[material])} tangentCOR={(referenceProfile?pair.grip_restitution:surface.tangentialRestitution)} deformationOffsetFraction={(referenceProfile?pair.normal_offset_fraction_of_radius:0)}\n");
        }
        float Slider(string text,float value,float low,float high,string format="0.0")
        {GUILayout.Label(text+": "+value.ToString(format),label);return GUILayout.HorizontalSlider(value,low,high);}
        void OnGUI()
        {
            if(!Active)return;
            if(label==null){label=new GUIStyle(GUI.skin.label){fontSize=16,wordWrap=true,normal={textColor=Color.white}};heading=new GUIStyle(label){fontSize=26,fontStyle=FontStyle.Bold};small=new GUIStyle(label){fontSize=13};}
            float scale=Screen.width/1440f;GUI.matrix=Matrix4x4.Scale(Vector3.one*scale);float h=Screen.height/scale;
            GUI.color=new Color(.025f,.05f,.065f,.96f);GUI.DrawTexture(new Rect(24,24,448,h-48),Texture2D.whiteTexture);GUI.color=Color.white;
            GUILayout.BeginArea(new Rect(44,40,408,h-80));scroll=GUILayout.BeginScrollView(scroll);
            GUILayout.Label("BOUNCE LAB",heading);GUILayout.Label($"{ball.Profile.radius_m*2000:0.0} mm solid rubber · {ball.Profile.mass_kg*1000:0.0} g · 180 Hz",label);
            GUILayout.Label("1 m grid · +Z away · +X right\nGreen line shows the rotation axis.\nMaterial calibration is in progress.",small);
            GUILayout.BeginHorizontal();if(GUILayout.Button((!referenceProfile?"• ":"")+"PROVISIONAL BALL",GUILayout.Height(28)))SelectReferenceProfile(false);
            if(GUILayout.Button((referenceProfile?"• ":"")+"P5 RUBBER / GRANITE",GUILayout.Height(28)))SelectReferenceProfile(true);GUILayout.EndHorizontal();
            GUILayout.Label(referenceProfile?"46 mm reference candidate: two measured spin misses remain.":"50 mm prototype: station pairs remain provisional.",small);
            string[] presets={"NO SPIN","RETURN","TOPSPIN","KICK LEFT","KICK RIGHT","VERTICAL AXIS"};
            for(int row=0;row<3;row++){GUILayout.BeginHorizontal();for(int col=0;col<2;col++){int i=row*2+col;if(GUILayout.Button(presets[i],GUILayout.Height(30)))Preset(i);}GUILayout.EndHorizontal();}
            Height=Slider("Center release height (m)",Height,.25f,3,"0.00");Speed=Slider("Horizontal speed (m/s)",Speed,0,8,"0.00");
            TopSpin=Slider("Top / back (rad/s)",TopSpin,-200,200,"0");KickSpin=Slider("Kick left / right (rad/s)",KickSpin,-200,200,"0");VerticalSpin=Slider("Vertical axis (rad/s)",VerticalSpin,-200,200,"0");
            GUILayout.Label($"Combined: {Spin.magnitude:0.0} rad/s / {Spin.magnitude/(2*Mathf.PI):0.0} rev/s; capped at 200 rad/s",small);
            GUILayout.BeginHorizontal();if(GUILayout.Button("RELEASE · SPACE",GUILayout.Height(34)))Launch();if(GUILayout.Button("REPLAY",GUILayout.Height(34)))Replay();GUILayout.EndHorizontal();
            Rate=Slider("Playback / simulation rate",Rate,.1f,1,"0.00");
            GUI.enabled=!referenceProfile;GUILayout.BeginHorizontal();for(int i=0;i<names.Length;i++)if(GUILayout.Button((material==i?"• ":"")+names[i])){material=i;slab.sharedMaterial=Surface.Material(names[i],bounce[i],friction[i]);Launch();}GUILayout.EndHorizontal();GUI.enabled=true;
            var pair=ball.Profile.response;
            GUILayout.Label(referenceProfile?$"Reference normal {pair.normal_restitution:0.000}; friction {pair.sliding_friction:0.000}; grip {pair.grip_restitution:0.000}":$"Normal restitution {bounce[material]:0.00}; friction {friction[material]:0.00}; tangential restitution {surface.tangentialRestitution:0.00}",small);
            GUILayout.Space(8);GUILayout.Label("FIRST CONTACT",label);
            if(ContactCount>0){var c=FirstContact;GUILayout.Label($"v in  {c.incomingVelocity:F3}\nv out {c.outgoingVelocity:F3}\nω in  {c.incomingSpin:F1}\nω out {c.outgoingSpin:F1}\nnormal {c.normal:F2}\nslip {c.slip:F3}\nJn {c.normalImpulse:0.00000} N·s\nJt {c.tangentImpulse:F5}",small,GUILayout.Height(148));}
            else GUILayout.Label("Awaiting contact",small,GUILayout.Height(148));
            GUILayout.Label($"Contacts {ContactCount} · time {ball.Clock:0.00} s\nEnergy {Energy():0.000} / initial {initialEnergy:0.000} J\nMaximum {maximumEnergy:0.000} J",small);
            GUILayout.EndScrollView();
            GUILayout.BeginHorizontal();if(GUILayout.Button("DROP INTO CUP",GUILayout.Height(30)))Launch(true);if(GUILayout.Button("EXPORT TRACE + IMAGE",GUILayout.Height(30)))Export();GUILayout.EndHorizontal();
            GUILayout.Label(message,small,GUILayout.Height(34));
            if(GUILayout.Button("RETURN TO YOUR POSITION · F2 / ESC",GUILayout.Height(34)))Toggle();GUILayout.EndArea();
        }
    }
}
