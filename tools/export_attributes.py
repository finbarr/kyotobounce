"""Preserve authored corner attributes through clipping and Blender GLB export.

Opt-in prefixes limit changes to explicitly selected construction materials.
Positions, topology, materials and other groups are never rewritten.
"""
import hashlib,json,math,struct

def interpolate_at_stored_positions(original,polygon):
    """Evaluate attributes at the final Float32 positions, using double arithmetic."""
    a,b,c=[tuple(v[0]) for v in original]
    ab=[b[k]-a[k] for k in range(3)];ac=[c[k]-a[k] for k in range(3)]
    cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
    axes=[k for k in range(3) if k!=max(range(3),key=lambda k:abs(cross[k]))];x,y=axes
    den=(b[y]-c[y])*(a[x]-c[x])+(c[x]-b[x])*(a[y]-c[y]);assert abs(den)>1e-18
    result=[]
    for point,normal,uv in polygon:
        exact=next((v for v in original if tuple(v[0])==tuple(point)),None)
        if exact is not None:result.append((point,exact[1],exact[2]));continue
        p=tuple(point);u=((b[y]-c[y])*(p[x]-c[x])+(c[x]-b[x])*(p[y]-c[y]))/den;v=((c[y]-a[y])*(p[x]-c[x])+(a[x]-c[x])*(p[y]-c[y]))/den;weights=(u,v,1-u-v)
        n=[sum(weights[i]*original[i][1][k] for i in range(3)) for k in range(3)];length=math.sqrt(sum(v*v for v in n));assert length>.1
        n=tuple(v/length for v in n);t=tuple(sum(weights[i]*original[i][2][k] for i in range(3)) for k in range(2));result.append((point,n,t))
    return result

def restore_glb_attributes(path,groups,prefixes):
    """Restore pre-export corner values after Blender custom-normal quantization."""
    original=path.read_bytes();length=struct.unpack_from('<I',original,12)[0];j=json.loads(original[20:20+length]);start=28+length;binary=bytearray(original[start:]);f32=lambda v:struct.unpack('<f',struct.pack('<f',v))[0]
    selected={label+' @ '+','.join(map(str,cell)):g for (label,cell),g in groups.items() if any(label.startswith(p) for p in prefixes)}
    assert selected,'No export groups matched the requested attribute prefixes'
    used=set();rows=[];allowed=set()
    def accessor(index):
        a=j['accessors'][index];v=j['bufferViews'][a['bufferView']];assert a['componentType']==5126 and not a.get('sparse');w={'VEC2':2,'VEC3':3}[a['type']];offset=v.get('byteOffset',0)+a.get('byteOffset',0);return a,w,offset,v.get('byteStride',w*4)
    for node in j['nodes']:
        if node.get('name') not in selected:continue
        name=node['name'];assert name not in used;used.add(name);g=selected[name];lookup={}
        for p,n,uv in zip(g['positions'],g['normals'],g['uv']):
            key=struct.pack('<3f',p[0],p[2],-p[1]);value=((n[0],n[2],-n[1]),(uv[0],1-uv[1]));lookup.setdefault(key,[]).append(value)
        count=0;maxAngle=0.;maxUV=0.;unique_fallbacks=[];topology_fallbacks=[]
        for primitive in j['meshes'][node['mesh']]['primitives']:
            pa,pw,po,ps=accessor(primitive['attributes']['POSITION']);na,nw,no,ns=accessor(primitive['attributes']['NORMAL']);ua,uw,uo,us=accessor(primitive['attributes']['TEXCOORD_0']);assert pa['count']==na['count']==ua['count']
            topology=None
            def topology_candidates(vertex):
                # A reset normal can share its position with a different face.
                # Match complete oriented triangles, then require all incident
                # faces to agree on this vertex's original attributes.
                nonlocal topology
                if topology is None:
                    source_faces={}
                    for face in g.get('faces',[]):
                        keys=[struct.pack('<3f',g['positions'][k][0],g['positions'][k][2],-g['positions'][k][1]) for k in face]
                        for corner in range(3):
                            oriented=tuple(keys[corner:]+keys[:corner]);k=face[corner]
                            N=g['normals'][k];U=g['uv'][k];value=((N[0],N[2],-N[1]),(U[0],1-U[1]))
                            source_faces.setdefault(oriented,{})[tuple(f32(x) for x in value[0]+value[1])]=value
                    if 'indices' in primitive:
                        ia=j['accessors'][primitive['indices']];iv=j['bufferViews'][ia['bufferView']]
                        assert ia['type']=='SCALAR' and not ia.get('sparse')
                        fmt={5121:'B',5123:'H',5125:'I'}[ia['componentType']];size=struct.calcsize(fmt)
                        at=iv.get('byteOffset',0)+ia.get('byteOffset',0)
                        indices=[struct.unpack_from('<'+fmt,binary,at+k*iv.get('byteStride',size))[0] for k in range(ia['count'])]
                    else:indices=list(range(pa['count']))
                    assert len(indices)%3==0 and primitive.get('mode',4)==4
                    topology={}
                    for at in range(0,len(indices),3):
                        face=indices[at:at+3];keys=[bytes(binary[po+k*ps:po+k*ps+12]) for k in face]
                        for corner,k in enumerate(face):
                            matches=source_faces.get(tuple(keys[corner:]+keys[:corner]),{})
                            if k not in topology:topology[k]=dict(matches)
                            else:topology[k]={key:q for key,q in topology[k].items() if key in matches}
                return topology.get(vertex,{})
            for i in range(pa['count']):
                key=bytes(binary[po+i*ps:po+i*ps+12]);candidates=lookup.get(key);assert candidates,('Exported position is not in source group',name,struct.unpack('<3f',key))
                n=struct.unpack_from('<3f',binary,no+i*ns);uv=struct.unpack_from('<2f',binary,uo+i*us)
                def errors(q):
                    N,U=q;dot=sum(a*b for a,b in zip(N,n))/math.sqrt(sum(a*a for a in N)*sum(a*a for a in n));return math.degrees(math.acos(max(-1,min(1,dot)))),max(abs(a-b) for a,b in zip(U,uv))
                eligible=[(errors(q),q) for q in candidates if errors(q)[0]<1 and errors(q)[1]<.00004]
                if not eligible:
                    # Blender can reset a custom normal on a nearly degenerate
                    # face. Restore only when this exact exported position has
                    # one authored normal/UV pair, with UV still in tolerance.
                    # Ambiguous corners keep the angular disambiguation gate.
                    unique={tuple(f32(x) for x in N+U):q for q in candidates for N,U in [q]}
                    if len(unique)==1:
                        q=next(iter(unique.values()));error=errors(q)
                        if error[1]<.00004:
                            eligible=[(error,q)];unique_fallbacks.append({'position':struct.unpack('<3f',key),'exportedNormal':n,'authoredNormal':q[0],'correctionDegrees':error[0]})
                if not eligible and g.get('faces'):
                    unique=topology_candidates(i)
                    if len(unique)==1:
                        q=next(iter(unique.values()));error=errors(q)
                        if error[1]<.00004:
                            eligible=[(error,q)];topology_fallbacks.append({'position':struct.unpack('<3f',key),'exportedNormal':n,'authoredNormal':q[0],'correctionDegrees':error[0]})
                assert eligible,('Unexplained attribute change' ,name,struct.unpack('<3f',key),n,uv)
                (angle,error),(N,U)=min(eligible,key=lambda row:row[0][0]+row[0][1]);maxAngle=max(maxAngle,angle);maxUV=max(maxUV,error)
                for offset,values,width in [(no+i*ns,N,3),(uo+i*us,U,2)]:
                    struct.pack_into('<'+str(width)+'f',binary,offset,*values);allowed.update(range(offset,offset+4*width))
                count+=1
        rows.append({'name':name,'vertices':count,'maximumNormalCorrectionDegrees':maxAngle,'maximumUVCorrection':maxUV,'unambiguousNormalFallbacks':unique_fallbacks,'triangleMatchedNormalFallbacks':topology_fallbacks})
    assert used==set(selected),(set(selected)-used)
    # Byte-level scope proof: only selected normal and UV elements may differ.
    assert all(a==b or i in allowed for i,(a,b) in enumerate(zip(original[start:],binary)))
    output=original[:start]+binary;path.write_bytes(output)
    return {'prefixes':prefixes,'groups':rows,'positionTopologyMaterialAndOtherBytesUnchanged':True,'inputSha256':hashlib.sha256(original).hexdigest(),'outputSha256':hashlib.sha256(output).hexdigest()}
