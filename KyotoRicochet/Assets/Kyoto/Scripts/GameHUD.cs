using UnityEngine;

namespace Kyoto
{
    public class GameHUD : MonoBehaviour
    {
        public GameController game;
        GUIStyle small,body,title,number,button,serif;
        readonly Color ink=new Color(.035f,.06f,.075f,.92f),muted=new Color(.65f,.74f,.77f),white=new Color(.91f,.94f,.91f),orange=new Color(1,.66f,.32f);
        Texture2D vignette;
        void Init()
        {
            var font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            small=new GUIStyle{font=font,fontSize=11,normal={textColor=muted}};
            body=new GUIStyle(small){fontSize=14,normal={textColor=white}};
            title=new GUIStyle(body){fontSize=28,fontStyle=FontStyle.Bold};
            number=new GUIStyle(body){fontSize=32};
            serif=new GUIStyle(title){font=Font.CreateDynamicFontFromOSFont("Georgia",60),fontSize=60,fontStyle=FontStyle.Normal};
            button=new GUIStyle(GUI.skin.button){font=font,fontSize=13,padding=new RectOffset(14,14,8,8)};
            vignette=new Texture2D(128,128,TextureFormat.RGBA32,false);
            for(int y=0;y<128;y++)for(int x=0;x<128;x++){float d=Vector2.Distance(new Vector2(x,y),new Vector2(63.5f,63.5f))/70;vignette.SetPixel(x,y,new Color(0,.025f,.03f,Mathf.SmoothStep(0,.65f,Mathf.InverseLerp(.65f,1.2f,d))));}
            vignette.Apply();
        }
        void Rect(float x,float y,float w,float h,Color c){GUI.color=c;GUI.DrawTexture(new Rect(x,y,w,h),Texture2D.whiteTexture);GUI.color=Color.white;}
        void Text(float x,float y,string t,GUIStyle style=null,float w=800,float h=40){GUI.Label(new Rect(x,y,w,h),t,style??body);}
        bool Button(float x,float y,float w,string label){return GUI.Button(new Rect(x,y,w,36),label,button);}
        public static bool AllowsWorldClick(GameController game,Vector2 pixel)
        {
            float scale=Screen.width/1440f,h=Screen.height/scale;var p=new Vector2(pixel.x/scale,h-pixel.y/scale);
            if(p.y<=210||p.y>=h-185)return false;
            return !(game.InChallenge&&p.x>=30&&p.x<=350&&p.y<= (game.Level.timingPeriod>0?374:310));
        }
        void OnGUI()
        {
            if(!game||!game.Ball)return;if(body==null)Init();
            float s=Screen.width/1440f,h=Screen.height/s;
            GUI.matrix=Matrix4x4.Scale(Vector3.one*s);
            // IMGUI owns keyboard shortcuts while a slider/button has focus. A click
            // back into the world releases that focus on the following input frame.
            if(Event.current.type==EventType.MouseDown&&Event.current.mousePosition.y>210&&Event.current.mousePosition.y<h-185)
                GUI.FocusControl(null);
            game.UIHasFocus=GUIUtility.hotControl!=0||GUIUtility.keyboardControl!=0;
            if(Time.unscaledTime<game.FadeUntil){Rect(0,0,1440,h,Color.black);return;}
            bool flying=game.Phase==GamePhase.Flight;
            if(flying&&game.Mode!=ViewMode.Observer&&game.Vignette)GUI.DrawTexture(new Rect(0,0,1440,h),vignette);
            Rect(0,0,1440,90,new Color(.025f,.045f,.055f,.83f));Rect(30,26,3,38,orange);
            Text(48,21,"KYOTO  /  RICOCHET",title);
            Text(49,58,"A STUDY IN MOMENTUM",small);
            Text(1105,20,"BANKED",small);Text(1104,39,game.Banked.ToString("0000"),number);
            Text(1250,20,"PERSONAL BEST",small);Text(1249,39,game.Best.ToString("0000"),number);
            if(game.Phase==GamePhase.Title||game.Phase==GamePhase.Complete)
            {
                bool done=game.Phase==GamePhase.Complete;
                Rect(70,h*.27f,565,done?310:375,ink);
                Text(102,h*.27f+28,done?$"{game.course.challenges.Length} ROUTES. ONE STATION.":game.phase2Layout?"KYOTO STATION  ·  DAYLIGHT":"KYOTO STATION  ·  BLUE HOUR",small);
                Text(99,h*.27f+65,done?"Beautifully landed.":"Throw yourself\ninto the moment.",serif,540,150);
                Text(102,h*.27f+(done?145:220),done?$"{game.Banked} points banked in {game.Attempts} throws.":"A rubber ball. A ceramic cup. An entire station between them.",body,515,40);
                Text(102,h*.27f+(done?182:253),done?"Return for a cleaner line, or a more ambitious ricochet.":"Bank off the architecture. Ride the flight. Find your line.",body,515,40);
                if(Button(102,h*.27f+(done?234:306),210,game.HasAuthoredCourse?"PLAY CHALLENGES  ↗":done?"PLAY AGAIN  ↗":"ENTER THE STATION  ↗"))
                {if(game.HasAuthoredCourse)game.StartChallenges();else game.Begin();}
                if(game.HasAuthoredCourse)
                {if(Button(335,h*.27f+(done?234:306),260,"FREE EXPLORATION  ↗"))game.Explore();}
                else Text(328,h*.27f+(done?245:317),"or press ENTER",small);
                Text(80,h-43,game.phase2Layout?"PHASE 2 DEVELOPMENT     ·     F2 PHYSICS LAB":"DESKTOP PROTOTYPE  /  01     ·     F2 PHYSICS LAB",small);
                if(game.phase2Layout)Text(80,h-24,"Map data © OpenStreetMap contributors · openstreetmap.org/copyright",small,850);
                Text(1030,h-43,"MATERIALS · MOMENTUM · SPACE",small);
                return;
            }
            Rect(30,110,320,100,ink);
            Text(48,125,game.phase2Layout&&game.FreeExploration?"FREE EXPLORATION":$"ROUTE {game.Index+1:00} / {game.course.challenges.Length:00}",small);
            Text(48,148,game.Level.title,title);
            Text(48,184,game.Level.subtitle,small,300,30);
            Rect(1120,110,290,100,ink);
            Text(1140,126,"CAMERA  /  "+game.Mode.ToString().ToUpper(),body);
            Text(1140,152,"TAB cycle     ESC observer",small);
            if(game.phase2Layout)
            {
                Text(1140,178,"LOOK SENSITIVITY",small);GUI.SetNextControlName("lookSensitivity");
                game.LookSensitivity=GUI.HorizontalSlider(new Rect(1270,179,116,20),game.LookSensitivity,.02f,.16f);
            }
            else Text(1140,178,$"M {(game.Muted?"sound on":"mute")}     V vignette",small);
            if(Time.time<game.NoticeUntil)
            {Rect(425,110,615,40,ink);Text(444,122,game.Notice,small,585,35);}
            if(game.Phase==GamePhase.Aim)
            {
                if(game.InChallenge)
                {
                    bool timed=game.Level.timingPeriod>0;float buttons=timed?328:267;
                    Rect(30,218,320,timed?156:92,ink);
                    Text(48,230,"STAND IN THE RING · FOLLOW THE ARROW",small,290);
                    if(timed)
                    {
                        var c=game.Level;double clock=StationMotion.Time(game.gameObject.scene);
                        Text(48,254,ChallengeRules.InTimingWindow(c,clock)?"COACH LINE · RELEASE WINDOW":"COACH LINE · WATCH THE STEP",small,290);
                        Rect(48,279,280,12,new Color(.15f,.22f,.24f));
                        for(int i=0;i<280;i++)if(ChallengeRules.InTimingWindow(c,(i+.5f)/280*c.timingPeriod))Rect(48+i,279,1,12,new Color(.3f,.75f,.58f));
                        float marker=ChallengeRules.TimingPhase(c,clock)/c.timingPeriod;Rect(48+marker*278,276,2,18,white);
                        Text(48,302,"H restores the tested aim. Timing stays in your hands.",small,290);
                    }
                    if(Button(48,buttons,140,"RETURN TO MARK"))game.ReturnToLaunch();
                    if(Button(198,buttons,130,"EXPLORE"))game.Explore();
                }
                Vector3 screen=game.view.WorldToScreenPoint(game.CupPosition+Vector3.up*.23f);
                if(screen.z>0)
                {
                    float px=screen.x/s,py=h-screen.y/s;
                    if(px>30&&px<1410&&py>215&&py<h-180){Rect(px-1,py,2,24,orange);Text(px-55,py-25,$"CUP · {Vector3.Distance(game.ReleasePosition,game.CupPosition):0.0} m",small,180);}
                }
                Rect(30,h-185,1380,155,ink);Rect(30,h-185,1380,2,new Color(.3f,.48f,.5f,.6f));
                Text(50,h-166,"ELEVATION",small);Text(50,h-145,$"{game.Pitch:0.0}°",number);
                Text(233,h-166,"POWER",small);Text(233,h-145,$"{game.Speed:0.00} m/s",number);
                Text(474,h-166,"TOP / BACK SPIN",small);Text(474,h-145,$"{game.Spin:0} rad/s",number);
                Text(725,h-166,"KICK LEFT / RIGHT",small);Text(725,h-145,$"{game.SideSpin:0} rad/s",number);
                Text(950,h-166,"ROUTE",small);Text(950,h-139,$"{game.Level.requiredBounces}+ banks · {game.Level.requiredSurfaces}+ surfaces",body,230);
                if(Button(1210,h-165,178,game.Charging?"RELEASE TO THROW":"THROW  ·  SPACE"))game.Throw();
                game.Pitch=GUI.HorizontalSlider(new Rect(50,h-95,150,20),game.Pitch,-65,80);
                game.Speed=GUI.HorizontalSlider(new Rect(233,h-95,200,20),game.Speed,.5f,16);
                game.Spin=GUI.HorizontalSlider(new Rect(474,h-95,200,20),game.Spin,-200,200);
                game.SideSpin=GUI.HorizontalSlider(new Rect(725,h-95,175,20),game.SideSpin,-200,200);
                if(Button(950,h-100,125,game.phase2Layout&&game.FreeExploration?"RESET AIM · H":"COACH · H"))game.Coach();
                if(Button(1086,h-100,145,game.Guide?"GUIDE ON · G":"GUIDE OFF · G")){game.Guide=!game.Guide;}
                Text(50,h-56,game.phase2Layout?"WASD walk · SHIFT faster     RIGHT-DRAG look     SCROLL power     Q/E top/back     Z/C kick     X clear spin     SPACE throw     R recall":"RIGHT-DRAG / ARROWS aim     SCROLL power     SHIFT fine aim     Q/E topspin     Z/C rebound kick     X clear spin     CLICK / SPACE exact throw",small,1300);
                Text(1249,h-88,!game.phase2Layout&&game.Index>=3?"NO PREVIEW":"PRACTICE LINE",small,150);
            }
            else
            {
                Rect(30,h-117,490,87,ink);
                Text(50,h-101,"IMPACTS",small);Text(50,h-82,game.Score.Bounces.ToString("00"),number);
                Text(176,h-101,"SURFACES",small);Text(176,h-82,game.Score.Unique.ToString("00"),number);
                Text(314,h-101,"SHOT VALUE",small);Text(314,h-82,game.Score.Points.ToString(),number);
                Text(575,h-70,$"{game.FlightTime:0.00} s   /   {game.TotalFlightDistance:0.0} m traveled",body);
                if(game.Phase==GamePhase.Success||game.Phase==GamePhase.Miss)
                {
                    bool success=game.Phase==GamePhase.Success;
                    Rect(1010,h-160,400,130,ink);Text(1030,h-145,success?"IN THE CUP.":"ANOTHER LINE.",title);
                    if(Button(1030,h-97,175,success?(game.phase2Layout&&game.FreeExploration?"KEEP EXPLORING":"NEXT ROUTE · ENTER"):"RETRY · R")){if(success)game.Next();else game.Retry();}
                    if(Button(1217,h-97,170,"REPLAY · P"))game.Replay();
                }
                if(flying)Text(1070,h-65,"R retry    M sound    V vignette",small,350);
                if(game.Phase==GamePhase.Replay)Text(1060,h-65,"RECORDED FLIGHT  /  0.65×",body,350);
            }
        }
    }
}
