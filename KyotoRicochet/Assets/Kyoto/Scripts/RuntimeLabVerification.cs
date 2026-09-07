using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace Kyoto
{
    // Opt-in native-player integration test. Calls the same lab actions as the buttons;
    // records the rendered player and contacts without altering the physics kernel.
    public sealed class RuntimeLabVerification : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Install()
        {
            if(Array.Exists(Environment.GetCommandLineArgs(),a=>a=="--kyoto-phase2-lab"))
                new GameObject("Native lab verification").AddComponent<RuntimeLabVerification>();
        }
        IEnumerator Start()
        {
            var args=Environment.GetCommandLineArgs();string output=null;
            foreach(var arg in args)if(arg.StartsWith("--kyoto-evidence="))output=arg.Substring("--kyoto-evidence=".Length);
            if(string.IsNullOrEmpty(output))output=Path.Combine(Application.persistentDataPath,"phase2-native-lab");
            Directory.CreateDirectory(output);
            var report=new List<string>{"Native Unity player integration test; lab preset methods match the UI buttons.",
                "This does not establish keyboard focus or mouse input behavior.",
                $"Unity={Application.unityVersion}; version={Application.version}; resolution={Screen.width}x{Screen.height}; GPU={SystemInfo.graphicsDeviceName}"};
            int failures=0;
            var game=FindFirstObjectByType<GameController>();
            if(!game){File.WriteAllText(Path.Combine(output,"FAILED.txt"),"No GameController");Application.Quit(1);yield break;}
            game.BeginVerification();game.Begin();
            var lab=game.GetComponent<PhysicsLab>();lab.Toggle();
            string[] names={"neutral","backspin-return","topspin","left-kick","right-kick","vertical-control"};
            var first=new ContactSample[6];var positions=new Vector3[6];
            for(int i=0;i<names.Length;i++)
            {
                lab.Preset(i);
                float deadline=Time.realtimeSinceStartup+15;
                while(lab.Ball.Clock<1.35f&&Time.realtimeSinceStartup<deadline)yield return null;
                first[i]=lab.FirstContact;positions[i]=lab.Ball.Body.position-lab.Release;
                bool hit=lab.ContactCount>0;
                if(!hit)failures++;
                report.Add((hit?"PASS ":"FAIL ")+names[i]+$" contacts={lab.ContactCount} firstOut={first[i].outgoingVelocity:F6} positionFromRelease={positions[i]:F6}");
                string specimen=lab.Export();
                string target=Path.Combine(output,names[i]);Directory.CreateDirectory(target);
                foreach(string file in Directory.GetFiles(specimen))File.Copy(file,Path.Combine(target,Path.GetFileName(file)),true);
                // Freeze only the playback clock after the measured trajectory is obtained.
                lab.Rate=0;
                yield return new WaitForEndOfFrame();
                ScreenCapture.CaptureScreenshot(Path.Combine(target,"native-lab.png"));
                yield return new WaitForSecondsRealtime(.35f);
                lab.Rate=1;
            }
            void Check(bool value,string label)
            {report.Add((value?"PASS ":"FAIL ")+label);if(!value)failures++;}
            Check(first[1].outgoingVelocity.z<0&&positions[1].z<0&&first[0].outgoingVelocity.z>0,"Backspin returns; matched neutral continues forward");
            Check(first[2].outgoingVelocity.z>first[0].outgoingVelocity.z,"Topspin increases forward rebound");
            Check(first[3].outgoingVelocity.x<-.5f&&first[4].outgoingVelocity.x>.5f,"Kick controls create opposite lateral contact impulses");
            Check(Mathf.Abs(first[3].outgoingVelocity.x+first[4].outgoingVelocity.x)<.002f,"Lateral impulses mirror");
            Check(Vector3.Distance(first[0].outgoingVelocity,first[5].outgoingVelocity)<.001f,"Pure vertical-axis spin negative control");
            foreach(string name in names)Check(File.Exists(Path.Combine(output,name,"native-lab.png")),"Rendered player capture: "+name);
            report.Add("Calibration remains incomplete; station material coefficients are provisional.");
            File.WriteAllLines(Path.Combine(output,"verification.txt"),report);
            Debug.Log("KYOTO_NATIVE_LAB "+(failures==0?"PASS":"FAIL")+" "+output);
            Application.Quit(failures==0?0:1);
        }
    }
}
