using UnityEngine;
namespace Kyoto
{
    [CreateAssetMenu(menuName = "Kyoto/Course")]
    public class Course : ScriptableObject { public string layoutSha256;public Challenge[] challenges; }
}
