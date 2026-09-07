using UnityEngine;
namespace Kyoto
{
    public class ImpactAudio : MonoBehaviour
    {
        public GameController game;
        AudioSource[] voices;
        AudioClip stone,steel,ceramic,success;
        AudioSource rolling,ambience;
        int next;
        void Awake()
        {
            stone=Make("Rubber on stone",420,.12f,1);steel=Make("Rubber on steel",1250,.30f,2);ceramic=Make("Ceramic rim",1900,.22f,3);success=Make("Cup landed",740,.7f,4);
            voices=new AudioSource[12];for(int i=0;i<voices.Length;i++){voices[i]=new GameObject("Spatial impact").AddComponent<AudioSource>();voices[i].transform.SetParent(transform);voices[i].spatialBlend=.85f;voices[i].minDistance=.6f;voices[i].maxDistance=65;voices[i].dopplerLevel=0;}
            var room=gameObject.AddComponent<AudioReverbZone>();room.minDistance=1;room.maxDistance=150;room.reverbPreset=AudioReverbPreset.Hangar;
            rolling=new GameObject("Rubber rolling").AddComponent<AudioSource>();rolling.transform.SetParent(transform);
            rolling.clip=NoiseLoop("Contact grain",3,32,.13f);rolling.loop=true;rolling.spatialBlend=.8f;rolling.dopplerLevel=0;rolling.minDistance=.5f;rolling.maxDistance=35;rolling.volume=0;rolling.Play();
            ambience=gameObject.AddComponent<AudioSource>();ambience.clip=NoiseLoop("Atrium ventilation",8,84,.006f);ambience.loop=true;ambience.spatialBlend=0;ambience.volume=.12f;ambience.Play();
        }
        void Update()
        {
            if(!game||!game.Ball)return;
            var ball=game.Ball;rolling.transform.position=ball.RenderPosition;
            float speed=Vector3.ProjectOnPlane(ball.Velocity,ball.ContactNormal).magnitude;
            bool supported=game.Phase==GamePhase.Flight&&ball.Clock-ball.LastContactTime<.02f&&ball.ContactNormal.y>.4f;
            rolling.volume=Mathf.Lerp(rolling.volume,supported?Mathf.Clamp01(speed*.05f):0,Time.deltaTime*18);
            rolling.pitch=.7f+Mathf.Min(1.2f,speed*.2f);
        }
        static AudioClip NoiseLoop(string name,float duration,int seed,float smoothing)
        {
            const int hz=22050;float[] samples=new float[(int)(hz*duration)];var random=new System.Random(seed);float value=0;
            for(int i=0;i<samples.Length;i++){value=Mathf.Lerp(value,(float)random.NextDouble()*2-1,smoothing);float t=i/(float)hz;samples[i]=(value*2+Mathf.Sin(t*60*2*Mathf.PI)*.016f)*Mathf.Min(1,Mathf.Min(t,duration-t)*8);}
            var clip=AudioClip.Create(name,samples.Length,1,hz,false);clip.SetData(samples,0);return clip;
        }
        public void Impact(Surface surface,Vector3 position,float speed)
        {
            var source=voices[next++%voices.Length];source.transform.position=position;
            source.pitch=.92f+Mathf.Min(.2f,speed*.01f);source.volume=Mathf.Clamp01(speed*.12f);
            source.clip=surface&&surface.tone>1600?ceramic:surface&&surface.tone>900?steel:stone;source.Play();
        }
        public void Success(){var s=voices[next++%voices.Length];s.transform.position=game.CupPosition;s.clip=success;s.volume=.65f;s.pitch=1;s.Play();}
        static AudioClip Make(string name,float frequency,float duration,int seed)
        {
            const int hz=44100;float[] samples=new float[(int)(hz*duration)];var random=new System.Random(seed);
            float smooth=0;
            for(int i=0;i<samples.Length;i++)
            {
                float t=i/(float)hz;float env=Mathf.Exp(-t/(duration*.19f));smooth=Mathf.Lerp(smooth,(float)random.NextDouble()*2-1,.25f);
                float tone=Mathf.Sin(t*frequency*2*Mathf.PI)*.4f+Mathf.Sin(t*frequency*2.73f*2*Mathf.PI)*.16f;
                samples[i]=(tone+smooth*(seed==1?.8f:.15f))*env*Mathf.Min(1,t*2000);
            }
            var clip=AudioClip.Create(name,samples.Length,1,hz,false);clip.SetData(samples,0);return clip;
        }
    }
}
