using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
namespace Kyoto
{
    // Opt-in integration test through the same controls, update loop and cameras as play.
    public class RuntimeSmoke : MonoBehaviour
    {
        readonly List<float> frameTimes=new List<float>();
        readonly List<string> checks=new List<string>();
        GameController game;
        string folder;
        bool failed;
        void Check(bool pass,string message)
        {failed|=!pass;checks.Add((pass?"PASS ":"FAIL ")+message);Debug.Log("KYOTO_RUNTIME "+checks[checks.Count-1]);}
        IEnumerator Flight()
        {
            game.Throw();float deadline=Time.realtimeSinceStartup+25;float start=Time.realtimeSinceStartup;
            while(game.Phase==GamePhase.Flight&&Time.realtimeSinceStartup<deadline)
            {if(Time.realtimeSinceStartup-start>.5f)frameTimes.Add(Time.unscaledDeltaTime*1000);yield return null;}
            Check(game.Phase==GamePhase.Success,$"route {game.Index+1} {game.Mode}: {game.Phase}, impacts={game.Score.Bounces}, surfaces={game.Score.Unique}");
        }
        IEnumerator Start()
        {
            game=GetComponent<GameController>();
            game.BeginVerification();
            folder=Path.Combine(Application.persistentDataPath,"verification");Directory.CreateDirectory(folder);
            yield return new WaitForSeconds(2);
            ScreenCapture.CaptureScreenshot(Path.Combine(folder,"title.png"));
            yield return new WaitForSeconds(.2f);game.Begin();
            for(int i=0;i<game.course.challenges.Length;i++)
            {
                game.Coach();game.SetMode((ViewMode)(i%3));
                yield return new WaitForSeconds(.6f);
                if(i==0)
                {
                    var target=game.view.WorldToViewportPoint(game.CupPosition+Vector3.up*.1f);
                    Check(target.z>0&&target.x>.05f&&target.x<.95f&&target.y>.22f&&target.y<.75f,"first cup is visible above aim controls");
                }
                ScreenCapture.CaptureScreenshot(Path.Combine(folder,$"route-{i+1}-aim.png"));
                yield return new WaitForSeconds(.15f);
                yield return Flight();
                ScreenCapture.CaptureScreenshot(Path.Combine(folder,$"route-{i+1}-capture.png"));
                yield return new WaitForSeconds(.15f);
                if(failed)break;
                if(i==0)
                {
                    var reference=new List<PoseSample>(game.Recording);int banked=game.Banked;
                    game.Replay();yield return new WaitForSeconds(1);ScreenCapture.CaptureScreenshot(Path.Combine(folder,"replay.png"));
                    while(game.Phase==GamePhase.Replay)yield return null;
                    foreach(var mode in new[]{ViewMode.Tumble,ViewMode.Observer})
                    {
                        game.Retry();game.Coach();game.SetMode(mode);yield return new WaitForSeconds(.3f);yield return Flight();
                        float error=0;int count=Mathf.Min(reference.Count,game.Recording.Count);
                        for(int p=0;p<count;p++)error=Mathf.Max(error,Vector3.Distance(reference[p].position,game.Recording[p].position));
                        Check(reference.Count==game.Recording.Count&&error<.0001f,$"camera isolation {mode}: samples={count}, maximum error={error:F7}m");
                        Check(game.Banked==banked,"retry does not farm banked points");
                    }
                }
                yield return new WaitForSeconds(.3f);game.Next();
            }
            Check(game.Phase==GamePhase.Complete,"five-route progression reaches completion");
            frameTimes.Sort();
            if(frameTimes.Count>0)checks.Add($"Flight frame intervals (screen capture enabled), n={frameTimes.Count}, median={frameTimes[frameTimes.Count/2]:F2}ms, p95={frameTimes[(int)(frameTimes.Count*.95f)]:F2}ms, max={frameTimes[frameTimes.Count-1]:F2}ms");
            checks.Add($"Banked score={game.Banked}; final={game.Phase}");
            checks.Add($"Unity={Application.unityVersion}; GPU={SystemInfo.graphicsDeviceName}; resolution={Screen.width}x{Screen.height}; physics={1f/Time.fixedDeltaTime:F0}Hz");
            checks.Insert(0,failed?"FAIL runtime integration":"PASS runtime integration");
            File.WriteAllLines(Path.Combine(folder,"result.txt"),checks);Debug.Log(failed?"KYOTO_SMOKE_FAIL":"KYOTO_SMOKE_PASS");
        }
        void Update()
        {
            if(game&&game.Phase==GamePhase.Flight&&game.FlightTime>.4f&&game.FlightTime<.4f+Time.deltaTime)
                ScreenCapture.CaptureScreenshot(Path.Combine(folder,$"route-{game.Index+1}-{game.Mode}-flight.png"));
        }
    }
}
