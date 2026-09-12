using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Kyoto.Editor
{
    [InitializeOnLoad]
    public static class BatchTasks
    {
        const string Key="KyotoBatchTask";
        static string CandidateLayoutPath()
        {
            const string prefix="--kyoto-layout-candidate=";
            var arg=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith(prefix));
            return arg==null?null:arg.Substring(prefix.Length);
        }
        static BatchTasks(){EditorApplication.update+=Tick;}
        public static void Generate(){Start("generate");}
        public static void Verify(){Start("verify");}
        public static void Baseline(){Start("baseline");}
        public static void Phase2Physics(){Start("phase2-physics");}
        public static void Phase2Reference(){Start("phase2-reference");}
        public static void Phase2SustainedContact(){Start("phase2-sustained-contact");}
        public static void Phase2MovingEscalators(){Start("phase2-moving-escalators");}
        public static void Phase2ContactAssessment(){Start("phase2-contact-assessment");}
        public static void Phase2GameProfile()
        {
            EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            SessionState.SetString(Key,"phase2-game-profile");EditorApplication.isPlaying=true;
        }
        public static void Phase2GameCourses()
        {
            EditorSceneManager.OpenScene(Phase2Builder.ScenePath);
            SessionState.SetString(Key,"phase2-game-courses");EditorApplication.isPlaying=true;
        }
        public static void Phase2Walking(){Start("phase2-walking");}
        public static void BrowserMotion(){Start("browser-motion");}
        public static void RobotPower(){Start("robot-power");}
        public static void StationSpin(){Start("station-spin");}
        public static void FlightContacts(){Start("flight-contacts");}
        public static void EscalatorWalking(){Start("escalator-walking");}
        public static void Phase2Routes(){Start("phase2-routes");}
        public static void Phase2Courses(){Start("phase2-courses");}
        public static void Phase2CupDiagnostic(){Start("phase2-cup-diagnostic");}
        public static void Phase2OverlapRegression(){Start("phase2-overlap-regression");}
        public static void Phase2GeometryImpacts(){Start("phase2-geometry-impacts");}
        public static void Phase2CourtImpacts(){Start("phase2-court-impacts");}
        public static void Phase2ConcourseImpacts(){Start("phase2-concourse-impacts");}
        public static void Phase2SouthHall(){Start("phase2-south-hall");}
        public static void Phase2CupBoundary(){Start("phase2-cup-boundary");}
        public static void Phase2GeometryRegression(){Start("phase2-geometry-regression");}
        public static void Phase2ContactRegression(){Start("phase2-contact-regression");}
        public static void Phase2RevalidateCourse(){Start("phase2-revalidate-course");}
        public static void Phase2Sections(){Start("phase2-sections");}
        public static void Phase2GlazingProbes(){Start("phase2-glazing-probes");}
        public static void Phase2MunicipalGround(){Start("phase2-municipal-ground");}
        public static void Phase2MunicipalEntrance(){Start("phase2-municipal-entrance");}
        static void Start(string task)
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            SessionState.SetString(Key,task);EditorApplication.isPlaying=true;
        }
        static void Tick()
        {
            if(!EditorApplication.isPlaying || EditorApplication.isCompiling || EditorApplication.isUpdating)return;
            string task=SessionState.GetString(Key,"");if(task=="")return;
            SessionState.EraseString(Key);
                try
                {
                    if(task=="generate")PrototypeBuilder.GenerateCourse();
                    else if(task=="baseline")Phase2Baseline.Run();
                    else if(task=="phase2-physics")Phase2PhysicsVerification.Run();
                    else if(task=="phase2-reference")ReferenceBallVerification.Run();
                    else if(task=="phase2-sustained-contact")SustainedContactVerification.Run();
                    else if(task=="phase2-south-hall")Phase2SouthHallVerification.Run();
                    else if(task=="phase2-moving-escalators")
                    {
                        var argument=Array.Find(Environment.GetCommandLineArgs(),a=>a.StartsWith("--kyoto-evidence="));
                        MovingEscalatorVerification.Run(argument==null?"../artifacts/phase2/moving-escalators/current":argument.Substring("--kyoto-evidence=".Length),CandidateLayoutPath());
                    }
                    else if(task=="phase2-contact-assessment")ContactModelAssessment.Run("../artifacts/phase2/calibration/cross-2014/compliant-runtime-cases.csv","../artifacts/phase2/calibration/cross-2014/editor-compliant");
                    else if(task=="phase2-game-profile")GameProfileVerification.Run();
                    else if(task=="phase2-game-courses")Phase2CourseVerification.Run(UnityEngine.Object.FindFirstObjectByType<GameController>(),"../artifacts/phase2/courses/gameplay-01");
                    else if(task=="phase2-walking")Phase2WalkingVerification.Run();
                    else if(task=="browser-motion")BrowserMotionVerification.Run();
                    else if(task=="robot-power")RobotPowerVerification.Run();
                    else if(task=="station-spin")StationSpinVerification.Run();
                    else if(task=="flight-contacts")FlightContactVerification.Run();
                    else if(task=="escalator-walking")EscalatorWalkingVerification.Run();
                    else if(task=="phase2-routes")Phase2RouteVerification.RunCandidate(CandidateLayoutPath());
                    else if(task=="phase2-courses")Phase2CourseSearch.Run();
                    else if(task=="phase2-cup-diagnostic")Kyoto.Editor.Phase2CupDiagnostic.Run();
                    else if(task=="phase2-geometry-impacts")GeometryImpactVerification.Run();
                    else if(task=="phase2-court-impacts")GeometryImpactVerification.RunCourt();
                    else if(task=="phase2-concourse-impacts")GeometryImpactVerification.RunConcourse(CandidateLayoutPath());
                    else if(task=="phase2-cup-boundary")CupBoundaryVerification.Run();
                    else if(task=="phase2-revalidate-course")
                    {
                        string root=null;
                        foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))root=arg.Substring("--kyoto-evidence=".Length);
                        if(root==null)throw new ArgumentException("Explicit course revalidation evidence directory required.");
                        Phase2CourseSearch.VerifyRetainedTrials(root,true,CandidateLayoutPath());
                    }
                    else if(task=="phase2-geometry-regression"||task=="phase2-contact-regression")
                    {
                        string root=null;
                        foreach(var arg in Environment.GetCommandLineArgs())if(arg.StartsWith("--kyoto-evidence="))root=arg.Substring("--kyoto-evidence=".Length);
                        if(root==null)throw new ArgumentException("Explicit regression evidence directory required.");
                        Kyoto.Editor.Phase2CupDiagnostic.Run(root+"/cup",true);
                        Phase2PhysicsVerification.Run(root+"/physics");
                        SustainedContactVerification.Run(root+"/sustained");
                        MovingEscalatorVerification.Run(root+"/moving");
                        if(task=="phase2-geometry-regression")Phase2CourseSearch.VerifyRetainedTrials(root+"/retained-courses");
                    }
                    else if(task=="phase2-overlap-regression")
                    {
                        string root="../artifacts/phase2/courses/overlap-regression-01";
                        Kyoto.Editor.Phase2CupDiagnostic.Run(root+"/cup",true);
                        Phase2PhysicsVerification.Run(root+"/physics");
                        SustainedContactVerification.Run(root+"/sustained");
                        MovingEscalatorVerification.Run(root+"/moving");
                    }
                    else if(task=="phase2-sections")SectionExport.Run();
                    else if(task=="phase2-glazing-probes")GlazingProbeDiagnostic.Run();
                    else if(task=="phase2-municipal-ground")MunicipalGroundVerification.Run();
                    else if(task=="phase2-municipal-entrance")Phase2MunicipalEntranceDiagnostic.Run();
                    else PhysicsVerification.Run();
                    Debug.Log("KYOTO_BATCH_PASS "+task);EditorApplication.Exit(0);
                }
                catch(Exception e){Debug.LogException(e);EditorApplication.Exit(1);}
        }
    }
}
