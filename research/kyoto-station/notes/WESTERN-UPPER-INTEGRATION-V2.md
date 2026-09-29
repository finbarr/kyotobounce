# Western station integration receipt

28 September 2026. Asset identity and acceptance results for the current local delivery.

```json
{
  "layoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
  "geometrySha256": "9f5735a0e543fe8ca0dd37e50478f1a3b9db4e0ab2f52cca7b05892521f7c0c2",
  "sourceSha256": "af248ddfdf5fbb3ee78c42a0b8594f484b95e9a339b9246652000553a35d33b6",
  "hardwareSha256": "ef0116ea90c801d28b81e0aa2d73c21ebd5bb8d0e21792ffecf957252224fe26",
  "source": {
    "layoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
    "sourceSha256": "af248ddfdf5fbb3ee78c42a0b8594f484b95e9a339b9246652000553a35d33b6",
    "checked": {
      "panels": 7031
    },
    "maximumPositionErrorM": 0.00000788624505094487,
    "panelTrianglesMatch": true,
    "uniqueNativeBindings": 47704,
    "scope": "Relocated panels and boxes; native route tests separately check stair traversal. This does not prove all external interfaces."
  },
  "routes": {
    "upper-connection-walk": {
      "layoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
      "pass": true,
      "walks": [
        {
          "label": "10F landing through restaurant and central Skyway",
          "samples": 1018,
          "pass": true,
          "maximumHeightErrorM": 0.025003208027413848
        },
        {
          "label": "Skyway return through restaurant to Grand Stairway",
          "samples": 1017,
          "pass": true,
          "maximumHeightErrorM": 0.025002512908507413
        }
      ]
    },
    "station-native-walk": {
      "layoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
      "pass": true,
      "walks": [
        {
          "label": "upper approach through all Grand Stairway flights",
          "samples": 764,
          "pass": true,
          "maximumHeightErrorM": 0.16234015788355194
        },
        {
          "label": "Grand Stairway return to upper approach",
          "samples": 774,
          "pass": true,
          "maximumHeightErrorM": 0.19605787420286092
        }
      ]
    },
    "south-connection": {
      "layoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
      "pass": true,
      "walks": [
        {
          "label": "southern approach up to plaza",
          "samples": 183,
          "pass": true,
          "maximumHeightErrorM": 0.06574942369312176
        },
        {
          "label": "southern approach return",
          "samples": 178,
          "pass": true,
          "maximumHeightErrorM": 0.15948472623148646
        }
      ]
    }
  },
  "northernReuse": {
    "testedLayoutSha256": "15d61e02c668c5144e29df57b01b17bd0d440ed3bf9d5b2a8c129c8350d42b92",
    "finalLayoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
    "northGeometryUnchanged": true,
    "onlyGeometryChange": "muromachi-south-connection: southern connector moved with its approaches",
    "samples": [
      {
        "label": "north escalators lane 1 up",
        "count": 421,
        "pass": true
      },
      {
        "label": "north escalators lane 1 down",
        "count": 498,
        "pass": true
      },
      {
        "label": "north escalators lane 2 up",
        "count": 500,
        "pass": true
      },
      {
        "label": "north escalators lane 2 down",
        "count": 420,
        "pass": true
      }
    ]
  },
  "runtime": {
    "pass": true,
    "layoutSha256": "55c24681d4a4fd77180c7b941f4261dc217b8711f56b1361144ab5001b85caa3",
    "geometrySha256": "9f5735a0e543fe8ca0dd37e50478f1a3b9db4e0ab2f52cca7b05892521f7c0c2",
    "command": "npm run test:runtime",
    "origin": "http://127.0.0.1:4426",
    "output": "\n> kyotobounce@0.3.0 test:runtime\n> node web/tests/v2-runtime.mjs\n\nPASS v2 exploration spawn, 1.38 m walk, full translation/spin rest (4.29 s), free result, recall and home\n"
  },
  "browser": {
    "errors": [],
    "views": [
      {
        "camera": [
          -71,
          18,
          20
        ],
        "frameSamples": 120,
        "medianMs": 16.699999999999818,
        "p95Ms": 16.700000000000728,
        "drawCalls": 827,
        "triangles": 1403576
      },
      {
        "camera": [
          -75,
          18,
          -18
        ],
        "frameSamples": 120,
        "medianMs": 16.69999999999891,
        "p95Ms": 16.700000000000728,
        "drawCalls": 309,
        "triangles": 1079106
      },
      {
        "camera": [
          -57,
          18,
          -8
        ],
        "frameSamples": 120,
        "medianMs": 16.69999999999891,
        "p95Ms": 16.700000000000728,
        "drawCalls": 428,
        "triangles": 1112859
      },
      {
        "camera": [
          -98,
          40,
          -20
        ],
        "frameSamples": 120,
        "medianMs": 16.69999999999891,
        "p95Ms": 16.799999999999272,
        "drawCalls": 157,
        "triangles": 957993
      },
      {
        "camera": [
          -134,
          47,
          18
        ],
        "frameSamples": 120,
        "medianMs": 16.69999999999709,
        "p95Ms": 16.799999999999272,
        "drawCalls": 70,
        "triangles": 788686
      },
      {
        "camera": [
          -124,
          46.8,
          25.5
        ],
        "frameSamples": 120,
        "medianMs": 16.700000000000728,
        "p95Ms": 16.799999999999272,
        "drawCalls": 1169,
        "triangles": 1949218
      },
      {
        "camera": [
          -95,
          46.8,
          9.5
        ],
        "frameSamples": 120,
        "medianMs": 16.700000000000728,
        "p95Ms": 16.799999999999272,
        "drawCalls": 1025,
        "triangles": 1734193
      },
      {
        "camera": [
          -69,
          46.8,
          -14.4
        ],
        "frameSamples": 120,
        "medianMs": 16.69999999999709,
        "p95Ms": 16.799999999999272,
        "drawCalls": 823,
        "triangles": 1695145
      }
    ]
  },
  "limits": [
    "Intermediate stair registration and vertical allocation remain construction assumptions.",
    "Restaurant materials and lighting remain provisional.",
    "Frame samples cover fixed views, not a release soak."
  ]
}
```
