#if UNITY_EDITOR || DEVELOPMENT_BUILD
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Diagnostics;
using UnityEngine;
using Debug = UnityEngine.Debug;

namespace Kyoto
{
    // A development-only experiment. BallBody still uses BallContactModel.
    // Isotropic sphere + fixed contact normal makes tangential slip collinear
    // throughout this contact solve, even for an arbitrary incoming spin axis.
    public static class ContactModelAssessment
    {
        sealed class Compliant
        {
            readonly double[] weights;
            readonly double h, frequency, restitution, friction, offset;
            public Compliant(int steps)
            {
                restitution=.9053865633803855; friction=.4137220816215133;
                frequency=2.735529338269375; offset=.0680633160613873;
                h=1.0/steps; weights=new double[steps]; double previous=0, a=2*restitution;
                for(int i=0;i<steps;i++)
                {
                    double t=(i+1)*h, cdf=(a+1)*Math.Pow(t,a)-a*Math.Pow(t,a+1);
                    weights[i]=cdf-previous; previous=cdf;
                }
            }
            public BallContactModel.Result Resolve(Vector3 v,Vector3 w,Vector3 n,BallProfile p,
                out double maxEnergyRatio, float supportMass=0)
            {
                var r=new BallContactModel.Result {velocity=v,spin=w}; maxEnergyRatio=1;
                double vn=Vector3.Dot(v,n); if(vn>=0)return r;
                double m=p.mass_kg, radius=p.radius_m, inertia=p.Inertia;
                var arm=-n*p.radius_m;
                r.slip=Vector3.ProjectOnPlane(v+Vector3.Cross(w,arm),n);
                double initialSlip=r.slip.magnitude, u=initialSlip,z=0,total=0;
                var direction=initialSlip>1e-12?r.slip/(float)initialSlip:Vector3.zero;
                double inverseMass=1/m+radius*radius/inertia+(supportMass>0?1.0/supportMass:0);
                double meff=1/inverseMass,k=frequency*frequency*meff;
                double midpoint=k*h*h/(4*meff),jn=-(1+restitution)*vn*m;
                double initial=.5*(m*v.sqrMagnitude+inertia*w.sqrMagnitude);
                for(int i=0;i<weights.Length;i++)
                {
                    double trial=(u*(1-midpoint)-k*h*z/meff)/(1+midpoint);
                    double impulse=meff*(trial-u), bound=friction*jn*weights[i];
                    bool clipped=Math.Abs(impulse)>bound;
                    impulse=Math.Max(-bound,Math.Min(bound,impulse));
                    double next=u+impulse/meff,zTrial=z+h*(u+next)/2;
                    if(clipped)
                    {
                        double returned=-2*impulse/(k*h)-z;
                        z=Math.Sign(-impulse)*Math.Min(Math.Abs(returned),Math.Abs(zTrial));
                    }
                    else z=zTrial;
                    total+=impulse;u=next;
                    // Includes elastic tangential storage and support kinetic
                    // energy, conservatively retaining the initial normal KE.
                    double change=total*initialSlip+.5*total*total*inverseMass+.5*k*z*z;
                    maxEnergyRatio=Math.Max(maxEnergyRatio,1+change/Math.Max(1e-15,initial));
                }
                r.normalImpulse=(float)jn; r.tangentImpulse=direction*(float)total;
                r.velocity+=(n*r.normalImpulse+r.tangentImpulse)/p.mass_kg;
                r.spin+=Vector3.Cross(arm,r.tangentImpulse)/p.Inertia;
                double effectiveOffset=radius*offset*initialSlip/Math.Max(1e-12,Math.Sqrt(initialSlip*initialSlip+vn*vn));
                var tangentSpin=Vector3.ProjectOnPlane(r.spin,n);
                r.deformationAngularImpulse=-tangentSpin.normalized*(float)Math.Min(inertia*tangentSpin.magnitude,effectiveOffset*jn);
                r.spin+=r.deformationAngularImpulse/p.Inertia;
                return r;
            }
        }

        static readonly CultureInfo CI=CultureInfo.InvariantCulture;
        static readonly List<string> report=new List<string>();
        static int failed;
        static float sink;
        static float F(string s)=>float.Parse(s,CI);
        static void Check(bool ok,string name,string detail="")
        {string line=(ok?"PASS ":"FAIL ")+name+" "+detail;report.Add(line);Debug.Log(line);if(!ok)failed++;}
        static BallContactModel.Result Impulse(Vector3 v,Vector3 w,Vector3 n,BallProfile p)
        {var a=p.response;return BallContactModel.Resolve(v,w,n,p,a.normal_restitution,a.sliding_friction,a.grip_restitution,a.normal_offset_fraction_of_radius);}

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Native()
        {
            var args=Environment.GetCommandLineArgs();
            if(!Array.Exists(args,a=>a=="--kyoto-contact-assessment"))return;
            string fixtures=null,output=null;
            foreach(var a in args)
            {
                if(a.StartsWith("--kyoto-model-cases="))fixtures=a.Substring("--kyoto-model-cases=".Length);
                if(a.StartsWith("--kyoto-evidence="))output=a.Substring("--kyoto-evidence=".Length);
            }
            try {Run(fixtures,output);Application.Quit(0);}
            catch(Exception e){Debug.LogException(e);Application.Quit(1);}
        }
        public static void Run(string fixtures,string output)
        {
            if(string.IsNullOrEmpty(fixtures)||string.IsNullOrEmpty(output))throw new ArgumentException("Explicit fixture and output paths are required.");
            report.Clear();failed=0;
            report.Add($"Unity {Application.unityVersion}; editor={Application.isEditor}; platform={Application.platform}; CPU={SystemInfo.processorType}");
            report.Add("Compliant candidate: implicit midpoint spring, 128 internal contact substeps; not a 128-frame impact.");
            var candidate=new Compliant(128);var profile=BallProfile.Cross2014();
            var rows=File.ReadAllLines(fixtures);float parity=0;int observations=0,holdouts=0,misses=0;
            for(int i=1;i<rows.Length;i++)
            {
                var c=rows[i].Split(',');float angle=F(c[2])*Mathf.Deg2Rad;
                bool normal=c[5]=="",passed=true;
                foreach(float speed in new[]{4f,5.25f,6.5f})
                {
                    var v=new Vector3(0,-Mathf.Sin(angle),Mathf.Cos(angle))*speed;
                    var w=Vector3.right*(F(c[3])*speed/profile.radius_m);
                    var r=candidate.Resolve(v,w,Vector3.up,profile,out _);
                    float en=r.velocity.y/-v.y,ratio=normal?0:r.velocity.z/v.z,delta=(r.spin.x-w.x)*profile.radius_m/speed;
                    parity=Mathf.Max(parity,Mathf.Abs(en-F(c[7])));
                    passed&=Mathf.Abs(en/F(c[4])-1)<=.10f;
                    if(!normal)
                    {
                        parity=Mathf.Max(parity,Mathf.Abs(ratio-F(c[8])),Mathf.Abs(delta-F(c[9])));
                        passed&=Mathf.Abs(ratio/F(c[5])-1)<=.10f&&Mathf.Abs(delta/F(c[6])-1)<=.15f;
                    }
                }
                observations++;
                if(c[1]=="holdout"){holdouts++;Check(passed,"Compliant measured holdout "+c[0]);}
                else if(!passed){misses++;report.Add("MODEL_MISS "+c[0]+" exceeds nominal spin target.");}
            }
            Check(observations==15&&holdouts==4,"Same 15 measured observations and four fixed holdouts");
            Check(parity<1e-5f,"Compliant C#/Python parity",parity.ToString("R",CI));
            Check(misses==1,"Compliant training miss remains visible",misses.ToString());
            Invariants(candidate,profile);Convergence(profile);Timing(candidate,profile);
            report.Add("Model assessment only. No proof of native mouse/keyboard input, full game frame time, or calibrated station materials.");
            Directory.CreateDirectory(output);File.WriteAllLines(Path.Combine(output,"contact-assessment.txt"),report);
            if(failed>0)throw new Exception(failed+" compliant assessment checks failed.");
        }
        static void Invariants(Compliant candidate,BallProfile p)
        {
            var rng=new System.Random(905);float Rand(float a,float b)=>a+(b-a)*(float)rng.NextDouble();
            double maxDuring=0;float energy=0,angular=0,frame=0,repeat=0;
            var rotation=Quaternion.Euler(31,117,-42);
            for(int i=0;i<6000;i++)
            {
                var v=new Vector3(Rand(-15,15),-Rand(.01f,12),Rand(-15,15));
                var w=Vector3.ClampMagnitude(new Vector3(Rand(-200,200),Rand(-200,200),Rand(-200,200)),200);
                var r=candidate.Resolve(v,w,Vector3.up,p,out double during);
                maxDuring=Math.Max(maxDuring,during);
                energy=Mathf.Max(energy,(p.mass_kg*r.velocity.sqrMagnitude+p.Inertia*r.spin.sqrMagnitude)/(p.mass_kg*v.sqrMagnitude+p.Inertia*w.sqrMagnitude));
                angular=Mathf.Max(angular,(p.Inertia*(r.spin-w)-Vector3.Cross(-Vector3.up*p.radius_m,r.tangentImpulse)-r.deformationAngularImpulse).magnitude);
                var rotated=candidate.Resolve(rotation*v,rotation*w,rotation*Vector3.up,p,out _);
                frame=Mathf.Max(frame,Vector3.Distance(rotated.velocity,rotation*r.velocity),p.radius_m*Vector3.Distance(rotated.spin,rotation*r.spin));
                var again=candidate.Resolve(v,w,Vector3.up,p,out _);
                repeat=Mathf.Max(repeat,Vector3.Distance(again.velocity,r.velocity),Vector3.Distance(again.spin,r.spin));
            }
            Check(energy<=1.000002f,"6000 mixed-spin compliant rebounds are passive",energy.ToString("R",CI));
            Check(maxDuring<=1.000002,"Tangential spring plus kinetic energy stays within initial budget",maxDuring.ToString("R",CI));
            Check(angular<1e-7,"Compliant angular impulse accounting",angular.ToString("R",CI));
            Check(frame<1e-4,"Compliant frame invariance",frame.ToString("R",CI));
            Check(repeat==0,"Exact same-input repeatability",repeat.ToString("R",CI));
            var neutral=candidate.Resolve(new Vector3(0,-3,1),Vector3.zero,Vector3.up,p,out _);
            var axial=candidate.Resolve(new Vector3(0,-3,1),Vector3.up*200,Vector3.up,p,out _);
            Check(Vector3.Distance(neutral.velocity,axial.velocity)<1e-6f&&Math.Abs(axial.spin.y-200)<1e-6f,"Normal-axis spin remains separate");
        }
        static void Convergence(BallProfile p)
        {
            var high=new Compliant(4096);var rng=new System.Random(128);float Rand(float a,float b)=>a+(b-a)*(float)rng.NextDouble();
            var vs=new Vector3[160];var ws=new Vector3[160];var expected=new BallContactModel.Result[160];
            for(int i=0;i<vs.Length;i++)
            {vs[i]=new Vector3(Rand(-8,8),-Rand(.1f,8),Rand(-8,8));ws[i]=Vector3.ClampMagnitude(new Vector3(Rand(-200,200),Rand(-200,200),Rand(-200,200)),200);expected[i]=high.Resolve(vs[i],ws[i],Vector3.up,p,out _);}
            foreach(int steps in new[]{64,128,256,512})
            {
                var low=new Compliant(steps);float speed=0,peripheral=0;
                for(int i=0;i<vs.Length;i++)
                {var r=low.Resolve(vs[i],ws[i],Vector3.up,p,out _);speed=Mathf.Max(speed,Vector3.Distance(r.velocity,expected[i].velocity));peripheral=Mathf.Max(peripheral,p.radius_m*Vector3.Distance(r.spin,expected[i].spin));}
                Check(speed<.01f&&peripheral<.01f,"Mixed-spin contact convergence",$"steps={steps}; max speed m/s={speed:R}; max R*spin m/s={peripheral:R}");
            }
        }
        static void Timing(Compliant candidate,BallProfile p)
        {
            // Kernels are constructed once, inputs are reused, no per-contact
            // allocations. Warm both JIT paths; alternate timing order.
            var vs=new Vector3[256];var ws=new Vector3[256];var rng=new System.Random(61);
            for(int i=0;i<vs.Length;i++)
            {vs[i]=new Vector3((float)rng.NextDouble()*8-4,-.1f-(float)rng.NextDouble()*8,(float)rng.NextDouble()*8-4);ws[i]=Vector3.ClampMagnitude(new Vector3((float)rng.NextDouble()*400-200,(float)rng.NextDouble()*400-200,(float)rng.NextDouble()*400-200),200);}
            double Measure(bool spring,int count)
            {
                float result=0;var watch=Stopwatch.StartNew();
                for(int i=0;i<count;i++)
                {int j=i&255;var r=spring?candidate.Resolve(vs[j],ws[j],Vector3.up,p,out _):Impulse(vs[j],ws[j],Vector3.up,p);result+=r.velocity.x+r.spin.z*.01f;}
                watch.Stop();sink=result;return watch.Elapsed.TotalMilliseconds*1000/count;
            }
            Measure(false,10000);Measure(true,10000);
            var impulses=new double[7];var springs=new double[7];
            for(int i=0;i<7;i++)
            {if(i%2==0){impulses[i]=Measure(false,100000);springs[i]=Measure(true,20000);}else{springs[i]=Measure(true,20000);impulses[i]=Measure(false,100000);}}
            report.Add("TIMING microseconds/contact; seven warmed alternating trials; setup excluded; managed Unity runtime.");
            for(int i=0;i<7;i++)report.Add($"TIMING trial={i}; impulse_us={impulses[i].ToString("R",CI)}; compliant128_us={springs[i].ToString("R",CI)}");
            Array.Sort(impulses);Array.Sort(springs);
            report.Add($"TIMING median impulse_us={impulses[3].ToString("R",CI)}; compliant128_us={springs[3].ToString("R",CI)}; ratio={(springs[3]/impulses[3]).ToString("R",CI)}; checksum={sink:R}");
        }
    }
}
#endif
