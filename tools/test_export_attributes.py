"""Focused regression checks for stored-position UVs and scoped GLB restoration."""
import json,struct,tempfile,unittest
from pathlib import Path
from export_attributes import interpolate_at_stored_positions,restore_glb_attributes

class ExportAttributeTests(unittest.TestCase):
    def test_cap_uv_uses_stored_point_instead_of_stale_interpolation(self):
        points=[(164.8,16.876,38.6479988),(165.88,16.876,38.6479988),(165.88,16.936,38.6479988)]
        original=[(p,(0,0,1),((p[0]-112.8)/1.6,2.061249)) for p in points]
        p=(165.86753845214844,16.87767219543457,38.6479988)
        result=interpolate_at_stored_positions(original,[(p,(.0026,0,1),(33.1672248840332,2.061249))])[0]
        self.assertAlmostEqual(result[2][0],(p[0]-112.8)/1.6,places=11)
        self.assertGreater(abs(result[2][0]-33.1672248840332),1e-5)
        self.assertEqual(result[1],(0,0,1));self.assertEqual(result[0],p)

    def fixture(self,path):
        groups={};j={'asset':{'version':'2.0'},'nodes':[],'meshes':[],'buffers':[],'bufferViews':[],'accessors':[]};binary=bytearray();ranges={}
        for name in ['Selected ceramic','Control stone']:
            positions=[(1,-3,2),(2,-3,2),(1,-3,3)];normals=[(0,-1,0)]*3;uv=[(0,1),(1,1),(0,0)];groups[(name,(0,0,0))]={'positions':positions,'normals':normals,'uv':uv}
            attrs={};ranges[name]={}
            for key,data,w in [('POSITION',[(p[0],p[2],-p[1]) for p in positions],3),('NORMAL',[(.001,0,1)]*3,3),('TEXCOORD_0',[(u+.000005,1-v) for u,v in uv],2)]:
                start=len(binary);chunk=b''.join(struct.pack('<'+str(w)+'f',*row) for row in data);binary.extend(chunk);view=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(chunk)});attrs[key]=len(j['accessors']);j['accessors'].append({'bufferView':view,'componentType':5126,'count':3,'type':'VEC'+str(w)});ranges[name][key]=(start,start+len(chunk))
            j['nodes'].append({'name':name+' @ 0,0,0','mesh':len(j['meshes'])});j['meshes'].append({'primitives':[{'attributes':attrs,'mode':4}]})
        j['buffers'].append({'byteLength':len(binary)});text=json.dumps(j,separators=(',',':')).encode();text+=b' '*((-len(text))%4);data=struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary;path.write_bytes(data);return groups,ranges,28+len(text),data

    def test_restoration_keeps_positions_and_control_bytes_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'test.glb';groups,ranges,start,before=self.fixture(p);r=restore_glb_attributes(p,groups,['Selected']);after=p.read_bytes();self.assertEqual(before[:start],after[:start]);self.assertEqual(len(before),len(after));self.assertTrue(r['positionTopologyMaterialAndOtherBytesUnchanged']);self.assertEqual(r['groups'][0]['vertices'],3)
            for name,channels in ranges.items():
                for key,(a,b) in channels.items():
                    if name=='Control stone' or key=='POSITION':self.assertEqual(before[start+a:start+b],after[start+a:start+b])
            a,_=ranges['Selected ceramic']['NORMAL'];self.assertEqual(struct.unpack_from('<3f',after,start+a),(0,0,1))
            a,_=ranges['Selected ceramic']['TEXCOORD_0'];self.assertEqual(struct.unpack_from('<2f',after,start+a),(0,0))

    def test_unexplained_position_or_uv_is_rejected_without_writing(self):
        for key,value in [('POSITION',2.5),('TEXCOORD_0',.5)]:
            with self.subTest(key=key),tempfile.TemporaryDirectory() as directory:
                p=Path(directory)/'test.glb';groups,ranges,start,before=self.fixture(p);bad=bytearray(before);at=ranges['Selected ceramic'][key][0];struct.pack_into('<f',bad,start+at,value);p.write_bytes(bad)
                with self.assertRaises(AssertionError):restore_glb_attributes(p,groups,['Selected'])
                self.assertEqual(p.read_bytes(),bytes(bad))

    def test_reset_normal_restored_only_with_unique_authored_attributes(self):
        for ambiguous in [False,True]:
            with self.subTest(ambiguous=ambiguous),tempfile.TemporaryDirectory() as directory:
                p=Path(directory)/'test.glb';groups,ranges,start,before=self.fixture(p)
                bad=bytearray(before);at=start+ranges['Selected ceramic']['NORMAL'][0]
                struct.pack_into('<3f',bad,at,0,1,0);p.write_bytes(bad)
                if ambiguous:
                    g=groups[('Selected ceramic',(0,0,0))]
                    g['positions'].append(g['positions'][0]);g['normals'].append((1,0,0));g['uv'].append(g['uv'][0])
                    with self.assertRaises(AssertionError):restore_glb_attributes(p,groups,['Selected'])
                    self.assertEqual(p.read_bytes(),bytes(bad))
                else:
                    report=restore_glb_attributes(p,groups,['Selected']);after=p.read_bytes()
                    self.assertEqual(struct.unpack_from('<3f',after,at),(0,0,1))
                    self.assertEqual(len(report['groups'][0]['unambiguousNormalFallbacks']),1)
                    for name,channels in ranges.items():
                        for key,(a,b) in channels.items():
                            if name=='Control stone' or key=='POSITION':self.assertEqual(after[start+a:start+b],bad[start+a:start+b])

    def test_triangle_match_disambiguates_only_distinct_incident_faces(self):
        for duplicate_triangle in [False,True]:
            with self.subTest(duplicate_triangle=duplicate_triangle),tempfile.TemporaryDirectory() as directory:
                p=Path(directory)/'test.glb';groups,ranges,start,before=self.fixture(p)
                g=groups[('Selected ceramic',(0,0,0))];g['faces']=[(0,1,2),(3,4,5)]
                extra=list(g['positions']) if duplicate_triangle else [g['positions'][0],(4,-3,2),(4,-3,3)]
                g['positions'].extend(extra);g['normals'].extend([(1,0,0)]*3);g['uv'].extend(g['uv'][:3])
                bad=bytearray(before);at=start+ranges['Selected ceramic']['NORMAL'][0]
                struct.pack_into('<3f',bad,at,0,1,0);p.write_bytes(bad)
                if duplicate_triangle:
                    with self.assertRaises(AssertionError):restore_glb_attributes(p,groups,['Selected'])
                    self.assertEqual(p.read_bytes(),bytes(bad))
                else:
                    report=restore_glb_attributes(p,groups,['Selected']);after=p.read_bytes()
                    self.assertEqual(struct.unpack_from('<3f',after,at),(0,0,1))
                    self.assertEqual(len(report['groups'][0]['triangleMatchedNormalFallbacks']),1)
                    for name,channels in ranges.items():
                        for key,(a,b) in channels.items():
                            if name=='Control stone' or key=='POSITION':self.assertEqual(after[start+a:start+b],bad[start+a:start+b])

if __name__=='__main__':unittest.main()
