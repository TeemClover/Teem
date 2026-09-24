export const house = {
  "schemaVersion": "1.0",
  "title": "Home / 01",
  "units": "metres",
  "worldConvention": {
    "x": "right viewed from front",
    "y": "up",
    "z": "toward front; rear negative"
  },
  "floors": [
    {
      "id": "f1",
      "name": "ชั้น 1",
      "elevation": 0
    },
    {
      "id": "f2",
      "name": "ชั้น 2",
      "elevation": 3.29
    }
  ],
  "gridX": {
    "1": 14.1,
    "2": 9.8,
    "3": 8.5,
    "4": 5.5,
    "5": 3.3,
    "6": 0
  },
  "gridZ": {
    "A": 0,
    "B": -1.6,
    "C": -3.5,
    "D": -5.2,
    "E": -6.9,
    "F": -10.3
  },
  "rooms": [
    {
      "id": "f1-g01-living",
      "floor": "f1",
      "name": "ห้องรับแขก",
      "planLabel": "G01",
      "kind": "living",
      "polygon": [
        [
          9.8,
          -6.9
        ],
        [
          14.1,
          -6.9
        ],
        [
          14.1,
          -2.05
        ],
        [
          9.8,
          -2.05
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g02-rear-sitting",
      "floor": "f1",
      "name": "ห้องนั่งเล่น",
      "planLabel": "G02",
      "kind": "living",
      "polygon": [
        [
          10.7,
          -10.3
        ],
        [
          14.1,
          -10.3
        ],
        [
          14.1,
          -6.9
        ],
        [
          10.7,
          -6.9
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g03-dining",
      "floor": "f1",
      "name": "รับประทานอาหาร",
      "planLabel": "G03",
      "kind": "dining",
      "polygon": [
        [
          5.5,
          -6.9
        ],
        [
          9.8,
          -6.9
        ],
        [
          9.8,
          -2.05
        ],
        [
          5.5,
          -2.05
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g04-prep",
      "floor": "f1",
      "name": "เตรียมอาหาร",
      "planLabel": "G04",
      "kind": "kitchen",
      "polygon": [
        [
          3.3,
          -6.9
        ],
        [
          5.5,
          -6.9
        ],
        [
          5.5,
          -3.5
        ],
        [
          3.3,
          -3.5
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ทางเข้าหลักจากที่จอดรถตามคำยืนยันเจ้าของ เปิดต่อเนื่องไปห้องรับประทานอาหาร",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g05-kitchen",
      "floor": "f1",
      "name": "ครัว",
      "planLabel": "G05",
      "kind": "kitchen",
      "polygon": [
        [
          2.2,
          -10.3
        ],
        [
          5.5,
          -10.3
        ],
        [
          5.5,
          -6.9
        ],
        [
          2.2,
          -6.9
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g05-1-service-kitchen",
      "floor": "f1",
      "name": "ครัวไทย",
      "planLabel": "G05/1",
      "kind": "service",
      "polygon": [
        [
          -0.6,
          -10.3
        ],
        [
          2.2,
          -10.3
        ],
        [
          2.2,
          -6.9
        ],
        [
          -0.6,
          -6.9
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g06-bath",
      "floor": "f1",
      "name": "ห้องน้ำ",
      "planLabel": "G06",
      "kind": "bath",
      "polygon": [
        [
          8.5,
          -10.3
        ],
        [
          10.7,
          -10.3
        ],
        [
          10.7,
          -8
        ],
        [
          8.5,
          -8
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-rear-hall",
      "floor": "f1",
      "name": "ทางเชื่อมด้านหลัง",
      "planLabel": null,
      "kind": "hall",
      "polygon": [
        [
          8.5,
          -8
        ],
        [
          10.7,
          -8
        ],
        [
          10.7,
          -6.9
        ],
        [
          8.5,
          -6.9
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g07-service-room",
      "floor": "f1",
      "name": "ห้องบริการ",
      "planLabel": "G07",
      "kind": "service",
      "polygon": [
        [
          -0.6,
          -5.5
        ],
        [
          1.8,
          -5.5
        ],
        [
          1.8,
          -3.5
        ],
        [
          -0.6,
          -3.5
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g08-service-bath",
      "floor": "f1",
      "name": "ห้องน้ำบริการ",
      "planLabel": "G08",
      "kind": "bath",
      "polygon": [
        [
          1.3,
          -6.9
        ],
        [
          3.3,
          -6.9
        ],
        [
          3.3,
          -5.5
        ],
        [
          1.3,
          -5.5
        ]
      ],
      "levelOffset": -0.08,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-service-passage",
      "floor": "f1",
      "name": "ทางเดินบริการ",
      "planLabel": null,
      "kind": "hall",
      "polygon": [
        [
          -0.6,
          -6.9
        ],
        [
          1.3,
          -6.9
        ],
        [
          1.3,
          -5.5
        ],
        [
          -0.6,
          -5.5
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-service-entry",
      "floor": "f1",
      "name": "ทางเข้าบริการ",
      "planLabel": null,
      "kind": "hall",
      "polygon": [
        [
          1.8,
          -5.5
        ],
        [
          3.3,
          -5.5
        ],
        [
          3.3,
          -3.5
        ],
        [
          1.8,
          -3.5
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g09-storage",
      "floor": "f1",
      "name": "ห้องเก็บของ",
      "planLabel": "G09",
      "kind": "service",
      "polygon": [
        [
          5.5,
          -10.3
        ],
        [
          8.5,
          -10.3
        ],
        [
          8.5,
          -9.25
        ],
        [
          5.5,
          -9.25
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-stair",
      "floor": "f1",
      "name": "บันได",
      "planLabel": null,
      "kind": "stair",
      "polygon": [
        [
          5.5,
          -9.25
        ],
        [
          8.5,
          -9.25
        ],
        [
          8.5,
          -6.9
        ],
        [
          5.5,
          -6.9
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g10-porch",
      "floor": "f1",
      "name": "เฉลียง",
      "planLabel": "G10",
      "kind": "balcony",
      "polygon": [
        [
          9.8,
          -2.05
        ],
        [
          14.35,
          -2.05
        ],
        [
          14.35,
          -0.8
        ],
        [
          9.8,
          -0.8
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-entry-terrace",
      "floor": "f1",
      "name": "ชานหน้าบ้าน",
      "planLabel": null,
      "kind": "balcony",
      "polygon": [
        [
          5.5,
          -2.05
        ],
        [
          9.8,
          -2.05
        ],
        [
          9.8,
          0
        ],
        [
          5.5,
          0
        ]
      ],
      "levelOffset": -0.195,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-carport",
      "floor": "f1",
      "name": "ที่จอดรถ",
      "planLabel": null,
      "kind": "carport",
      "polygon": [
        [
          0,
          -3.5
        ],
        [
          5.5,
          -3.5
        ],
        [
          5.5,
          0.6
        ],
        [
          0,
          0.6
        ]
      ],
      "levelOffset": -0.35,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f1-g12-laundry",
      "floor": "f1",
      "name": "ซักล้าง",
      "planLabel": "G12",
      "kind": "service",
      "polygon": [
        [
          0,
          -11.85
        ],
        [
          2.75,
          -11.85
        ],
        [
          2.75,
          -10.3
        ],
        [
          0,
          -10.3
        ]
      ],
      "levelOffset": -0.35,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 1
      },
      "calibrationId": "cal-f1-v1"
    },
    {
      "id": "f2-201-bedroom",
      "floor": "f2",
      "name": "ห้องนอน 201",
      "planLabel": "201",
      "kind": "bedroom",
      "polygon": [
        [
          9.8,
          -6.9
        ],
        [
          14.1,
          -6.9
        ],
        [
          14.1,
          -1.85
        ],
        [
          9.8,
          -1.85
        ]
      ],
      "levelOffset": 0,
      "photoSetId": "photos-bedroom",
      "description": "ห้องนอนตามภาพที่เจ้าของยืนยันเป็นห้อง 201 หัวเตียงชิดผนังด้านห้องพักผ่อน และเข้าห้องน้ำผ่านห้องแต่งตัว",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-201-1-dressing",
      "floor": "f2",
      "name": "ห้องแต่งตัว",
      "planLabel": "201/1",
      "kind": "service",
      "polygon": [
        [
          11.6,
          -10.3
        ],
        [
          14.1,
          -10.3
        ],
        [
          14.1,
          -6.9
        ],
        [
          11.6,
          -6.9
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-202-bedroom",
      "floor": "f2",
      "name": "ห้องนอน 202",
      "planLabel": "202",
      "kind": "bedroom",
      "polygon": [
        [
          3.3,
          -5.2
        ],
        [
          5.5,
          -5.2
        ],
        [
          5.5,
          0
        ],
        [
          -0.6,
          0
        ],
        [
          -0.6,
          -3.5
        ],
        [
          3.3,
          -3.5
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "อ้างอิงรูปห้อง ช่องประตู และการจัดเตียงจากแปลนเดิม เจ้าของยืนยันว่าไม่มีภาพถ่ายประกอบห้องนี้",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1",
      "reviewNote": "Owner correction: west upper-storey face is flush with ground floor; absorb the former narrow service-roof ledge into the upper footprint for screen presentation."
    },
    {
      "id": "f2-203-bedroom",
      "floor": "f2",
      "name": "ห้องนอน 203",
      "planLabel": "203",
      "kind": "bedroom",
      "polygon": [
        [
          -0.6,
          -10.3
        ],
        [
          5.5,
          -10.3
        ],
        [
          5.5,
          -6.9
        ],
        [
          -0.6,
          -6.9
        ]
      ],
      "levelOffset": 0,
      "photoSetId": null,
      "description": "อ้างอิงรูปห้อง ช่องประตู และการจัดเตียงจากแปลนเดิม เจ้าของยืนยันว่าไม่มีภาพถ่ายประกอบห้องนี้",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1",
      "reviewNote": "Owner correction: west upper-storey face is flush with ground floor; absorb the former narrow service-roof ledge into the upper footprint for screen presentation."
    },
    {
      "id": "f2-204-hall",
      "floor": "f2",
      "name": "โถงบันได",
      "planLabel": "204",
      "kind": "hall",
      "polygon": [
        [
          3.3,
          -6.9
        ],
        [
          5.5,
          -6.9
        ],
        [
          5.5,
          -7.4
        ],
        [
          8.5,
          -7.4
        ],
        [
          8.5,
          -9.15
        ],
        [
          9.65,
          -9.15
        ],
        [
          9.65,
          -6.9
        ],
        [
          9.8,
          -6.9
        ],
        [
          9.8,
          -5.2
        ],
        [
          3.3,
          -5.2
        ]
      ],
      "levelOffset": 0,
      "photoSetId": "photos-stair-chandelier",
      "description": "โถงชั้นบนเชื่อมห้องพักผ่อนและบันได มีแชนเดอเลียร์คริสตัล 8 วงลดหลั่นในโถงสูง ตามภาพและคำยืนยันเจ้าของบ้าน",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-204-1-lounge",
      "floor": "f2",
      "name": "ห้องพักผ่อน",
      "planLabel": "204/1",
      "kind": "lounge",
      "polygon": [
        [
          5.5,
          -5.2
        ],
        [
          9.8,
          -5.2
        ],
        [
          9.8,
          -1.6
        ],
        [
          5.5,
          -1.6
        ]
      ],
      "levelOffset": 0,
      "photoSetId": "photos-study",
      "description": "พื้นที่พักผ่อนเปิดจากโถงบันไดเต็มแนวด้านหลัง โซฟาฝั่งห้องนอน 201 และโต๊ะคอมฝั่งห้องนอน 202 ตามคำยืนยันเจ้าของ",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-205-bath",
      "floor": "f2",
      "name": "ห้องน้ำ 205",
      "planLabel": "205",
      "kind": "bath",
      "polygon": [
        [
          9.65,
          -10.3
        ],
        [
          11.6,
          -10.3
        ],
        [
          11.6,
          -6.9
        ],
        [
          9.65,
          -6.9
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-206-bath",
      "floor": "f2",
      "name": "ห้องน้ำ 206",
      "planLabel": "206",
      "kind": "bath",
      "polygon": [
        [
          -0.6,
          -5.2
        ],
        [
          3.3,
          -5.2
        ],
        [
          3.3,
          -3.5
        ],
        [
          -0.6,
          -3.5
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1",
      "reviewNote": "Owner correction: west upper-storey face is flush with ground floor; absorb the former narrow service-roof ledge into the upper footprint for screen presentation."
    },
    {
      "id": "f2-207-bath",
      "floor": "f2",
      "name": "ห้องน้ำ 207",
      "planLabel": "207",
      "kind": "bath",
      "polygon": [
        [
          -0.6,
          -6.9
        ],
        [
          3.3,
          -6.9
        ],
        [
          3.3,
          -5.2
        ],
        [
          -0.6,
          -5.2
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1",
      "reviewNote": "Owner correction: west upper-storey face is flush with ground floor; absorb the former narrow service-roof ledge into the upper footprint for screen presentation."
    },
    {
      "id": "f2-208-vent-space",
      "floor": "f2",
      "name": "ช่องลม",
      "planLabel": "208",
      "kind": "void",
      "polygon": [
        [
          8.5,
          -10.3
        ],
        [
          9.65,
          -10.3
        ],
        [
          9.65,
          -9.15
        ],
        [
          8.5,
          -9.15
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-209-balcony",
      "floor": "f2",
      "name": "ระเบียง 209",
      "planLabel": "209",
      "kind": "balcony",
      "polygon": [
        [
          9.8,
          -1.85
        ],
        [
          14.35,
          -1.85
        ],
        [
          14.35,
          -0.8
        ],
        [
          13.4,
          -0.8
        ],
        [
          13.4,
          -0.4
        ],
        [
          9.3,
          -0.4
        ],
        [
          9.3,
          -1.6
        ],
        [
          9.8,
          -1.6
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1"
    },
    {
      "id": "f2-210-balcony",
      "floor": "f2",
      "name": "ระเบียง 210",
      "planLabel": "210",
      "kind": "balcony",
      "polygon": [
        [
          -0.6,
          0
        ],
        [
          5.5,
          0
        ],
        [
          5.5,
          0.6
        ],
        [
          4.8,
          0.6
        ],
        [
          4.8,
          0.95
        ],
        [
          0.6,
          0.95
        ],
        [
          0.6,
          0.6
        ],
        [
          -0.6,
          0.6
        ]
      ],
      "levelOffset": -0.04,
      "photoSetId": null,
      "description": "ถอดแนวราบจากแปลนต้นทาง ตำแหน่งภาพอ้างอิงยังแยกจากการยืนยันห้อง",
      "evidenceStatus": "derived",
      "geometryStatus": "draft",
      "sourceRef": {
        "sourceId": "SRC-PLAN",
        "page": 2
      },
      "calibrationId": "cal-f2-v1",
      "reviewNote": "Owner correction: west upper-storey face is flush with ground floor; absorb the former narrow service-roof ledge into the upper footprint for screen presentation."
    }
  ],
  "walls": [
    {
      "id": "f1-back",
      "floor": "f1",
      "a": [
        -0.6,
        -10.3
      ],
      "b": [
        14.1,
        -10.3
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.4,
          "width": 1.6,
          "height": 1.1,
          "sill": 1.1,
          "kind": "window"
        },
        {
          "offset": 3.1,
          "width": 2.7,
          "height": 1.15,
          "sill": 1.05,
          "kind": "window"
        },
        {
          "offset": 6.55,
          "width": 2.1,
          "height": 2.55,
          "sill": 0.15,
          "kind": "window"
        },
        {
          "offset": 9.2,
          "width": 0.55,
          "height": 0.6,
          "sill": 1.7,
          "kind": "window"
        },
        {
          "offset": 11.65,
          "width": 2.45,
          "height": 2.25,
          "sill": 0,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Owner-provided chandelier photograph shows a tall rear window across the double-height stair hall. Aligned 2.1 m glazed openings centered at x=7.0 reproduce that relationship across both storeys; presentation dimensions remain approximate."
    },
    {
      "id": "f1-east",
      "floor": "f1",
      "a": [
        14.1,
        -10.3
      ],
      "b": [
        14.1,
        -2.05
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.9,
          "width": 1.75,
          "height": 2.25,
          "sill": 0,
          "kind": "window"
        },
        {
          "offset": 3.85,
          "width": 3.15,
          "height": 2.25,
          "sill": 0,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-front",
      "floor": "f1",
      "a": [
        5.5,
        -2.05
      ],
      "b": [
        14.1,
        -2.05
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.6,
          "width": 3.1,
          "height": 2.3,
          "sill": 0,
          "kind": "window"
        },
        {
          "offset": 4.55,
          "width": 3.1,
          "height": 2.3,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-west",
      "floor": "f1",
      "a": [
        -0.6,
        -10.3
      ],
      "b": [
        -0.6,
        -3.5
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.5,
          "width": 1.5,
          "height": 1.1,
          "sill": 1.1,
          "kind": "window"
        },
        {
          "offset": 3.45,
          "width": 0.8,
          "height": 2.05,
          "sill": 0,
          "kind": "door"
        },
        {
          "offset": 5.35,
          "width": 1,
          "height": 1.3,
          "sill": 0.85,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-service-front",
      "floor": "f1",
      "a": [
        -0.6,
        -3.5
      ],
      "b": [
        3.3,
        -3.5
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 2.55,
          "width": 0.85,
          "height": 2.05,
          "sill": 0,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Owner clarification 2026-09-24: the carport enters the main house only through food preparation, which is open to dining."
    },
    {
      "id": "f1-prep-front",
      "floor": "f1",
      "a": [
        3.3,
        -3.5
      ],
      "b": [
        5.5,
        -3.5
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.45,
          "width": 1.2,
          "height": 2.1,
          "sill": 0,
          "kind": "door",
          "hingeSide": "start",
          "swingInto": "f1-g04-prep",
          "placementStatus": "owner-confirmed"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Owner clarification 2026-09-24: the carport enters the main house only through food preparation, which is open to dining."
    },
    {
      "id": "f1-dining-west",
      "floor": "f1",
      "a": [
        5.5,
        -3.5
      ],
      "b": [
        5.5,
        -2.05
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.25,
          "width": 0.85,
          "height": 2.1,
          "sill": 0,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Owner clarification 2026-09-24: the carport enters the main house only through food preparation, which is open to dining."
    },
    {
      "id": "f1-kitchen-west",
      "floor": "f1",
      "a": [
        2.2,
        -10.3
      ],
      "b": [
        2.2,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 1.95,
          "width": 0.9,
          "height": 2.1,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-kitchen-east",
      "floor": "f1",
      "a": [
        5.5,
        -10.3
      ],
      "b": [
        5.5,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 2.35,
          "width": 0.85,
          "height": 2.1,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-kitchen-front",
      "floor": "f1",
      "a": [
        2.2,
        -6.9
      ],
      "b": [
        5.5,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 1.2,
          "width": 1.6,
          "height": 2.25,
          "sill": 0,
          "kind": "open-passage"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-service-divide",
      "floor": "f1",
      "a": [
        -0.6,
        -6.9
      ],
      "b": [
        2.2,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 0.55,
          "width": 0.9,
          "height": 2.05,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-service-room-back",
      "floor": "f1",
      "a": [
        -0.6,
        -5.5
      ],
      "b": [
        3.3,
        -5.5
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 2.55,
          "width": 0.8,
          "height": 2.05,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-service-room-east",
      "floor": "f1",
      "a": [
        1.8,
        -5.5
      ],
      "b": [
        1.8,
        -3.5
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 0.25,
          "width": 0.8,
          "height": 2.05,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-service-bath-west",
      "floor": "f1",
      "a": [
        1.3,
        -6.9
      ],
      "b": [
        1.3,
        -5.5
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 0.2,
          "width": 0.7,
          "height": 2,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-prep-west",
      "floor": "f1",
      "a": [
        3.3,
        -6.9
      ],
      "b": [
        3.3,
        -3.5
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 1.9,
          "width": 0.85,
          "height": 2.05,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-bath-west",
      "floor": "f1",
      "a": [
        8.5,
        -10.3
      ],
      "b": [
        8.5,
        -8
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-bath-east",
      "floor": "f1",
      "a": [
        10.7,
        -10.3
      ],
      "b": [
        10.7,
        -8
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f1-bath-front",
      "floor": "f1",
      "a": [
        8.5,
        -8
      ],
      "b": [
        10.7,
        -8
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 1.25,
          "width": 0.8,
          "height": 2.05,
          "sill": 0,
          "kind": "door",
          "hingeSide": "end",
          "swingInto": "f1-g06-bath"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 1: bathroom G06 door is at the southeast/front corner, beside the washbasin wall; the west wall is continuous."
    },
    {
      "id": "f1-rear-sitting-partition",
      "floor": "f1",
      "a": [
        10.7,
        -6.9
      ],
      "b": [
        14.1,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 0.35,
          "width": 2.7,
          "height": 2.4,
          "sill": 0,
          "kind": "open-passage"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-back",
      "floor": "f2",
      "a": [
        -0.6,
        -10.3
      ],
      "b": [
        14.1,
        -10.3
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 1.15,
          "width": 2.3,
          "height": 1.8,
          "sill": 0.5,
          "kind": "window"
        },
        {
          "offset": 6.55,
          "width": 2.1,
          "height": 2.55,
          "sill": 0.1,
          "kind": "window"
        },
        {
          "offset": 10.549999999999999,
          "width": 0.9,
          "height": 0.65,
          "sill": 1.6,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Owner-provided chandelier photograph shows a tall rear window across the double-height stair hall. Aligned 2.1 m glazed openings centered at x=7.0 reproduce that relationship across both storeys; presentation dimensions remain approximate."
    },
    {
      "id": "f2-west",
      "floor": "f2",
      "a": [
        -0.6,
        -10.3
      ],
      "b": [
        -0.6,
        0
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.7,
          "width": 2.1,
          "height": 1.8,
          "sill": 0.5,
          "kind": "window"
        },
        {
          "offset": 3.65,
          "width": 0.7,
          "height": 0.6,
          "sill": 1.6,
          "kind": "window"
        },
        {
          "offset": 5.45,
          "width": 0.65,
          "height": 0.6,
          "sill": 1.6,
          "kind": "window"
        },
        {
          "offset": 7.3,
          "width": 1.6,
          "height": 1.8,
          "sill": 0.5,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-east",
      "floor": "f2",
      "a": [
        14.1,
        -10.3
      ],
      "b": [
        14.1,
        -1.85
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 4,
          "width": 1.8,
          "height": 1.8,
          "sill": 0.5,
          "kind": "window"
        },
        {
          "offset": 6.4,
          "width": 1.25,
          "height": 1.8,
          "sill": 0.5,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-front-left",
      "floor": "f2",
      "a": [
        -0.6,
        0
      ],
      "b": [
        5.5,
        0
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 1.75,
          "width": 3.15,
          "height": 2.3,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-front-center",
      "floor": "f2",
      "a": [
        5.5,
        -1.6
      ],
      "b": [
        9.8,
        -1.6
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.8,
          "width": 2.55,
          "height": 2.15,
          "sill": 0.15,
          "kind": "window"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-front-right",
      "floor": "f2",
      "a": [
        9.8,
        -1.85
      ],
      "b": [
        14.1,
        -1.85
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [
        {
          "offset": 0.45,
          "width": 3.15,
          "height": 2.3,
          "sill": 0,
          "kind": "door"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-left-return",
      "floor": "f2",
      "a": [
        5.5,
        -1.6
      ],
      "b": [
        5.5,
        0
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-right-return",
      "floor": "f2",
      "a": [
        9.8,
        -1.85
      ],
      "b": [
        9.8,
        -1.6
      ],
      "exterior": true,
      "height": 2.7,
      "thickness": 0.15,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-203-east",
      "floor": "f2",
      "a": [
        5.5,
        -10.3
      ],
      "b": [
        5.5,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-203-front",
      "floor": "f2",
      "a": [
        -0.6,
        -6.9
      ],
      "b": [
        5.5,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 3.0500000000000003,
          "width": 0.75,
          "height": 2.05,
          "sill": 0,
          "kind": "door",
          "hingeSide": "end",
          "swingInto": "f2-207-bath"
        },
        {
          "offset": 4.35,
          "width": 0.85,
          "height": 2.1,
          "sill": 0,
          "kind": "door",
          "hingeSide": "end",
          "swingInto": "f2-203-bedroom"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 2: separate doors connect bedroom 203 to its bathroom 207 at the northeast bathroom corner, and to hall 204 farther east."
    },
    {
      "id": "f2-baths-east",
      "floor": "f2",
      "a": [
        3.3,
        -6.9
      ],
      "b": [
        3.3,
        -3.5
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 2 detailed review: east-wall circles are washbasins, not doors; bathroom 207 opens north to bedroom 203 and bathroom 206 opens south to bedroom 202."
    },
    {
      "id": "f2-middle-partition",
      "floor": "f2",
      "a": [
        -0.6,
        -5.2
      ],
      "b": [
        5.5,
        -5.2
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 4.35,
          "width": 0.85,
          "height": 2.1,
          "sill": 0,
          "kind": "door",
          "hingeSide": "end",
          "swingInto": "f2-202-bedroom"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 2: the hall/living-room boundary from x=5.5 to x=9.8 is an open beam line, not a partition wall."
    },
    {
      "id": "f2-206-front",
      "floor": "f2",
      "a": [
        -0.6,
        -3.5
      ],
      "b": [
        3.3,
        -3.5
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 3.0,
          "width": 0.75,
          "height": 2.05,
          "sill": 0,
          "kind": "door",
          "hingeSide": "end",
          "swingInto": "f2-206-bath"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 2: bathroom 206 opens south into bedroom 202 beside the east-wall washbasin."
    },
    {
      "id": "f2-202-east",
      "floor": "f2",
      "a": [
        5.5,
        -5.2
      ],
      "b": [
        5.5,
        -1.6
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-201-west",
      "floor": "f2",
      "a": [
        9.8,
        -6.9
      ],
      "b": [
        9.8,
        -1.85
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 0.5,
          "width": 0.95,
          "height": 2.15,
          "sill": 0,
          "kind": "door",
          "hingeSide": "start",
          "swingInto": "f2-201-bedroom"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    },
    {
      "id": "f2-201-rear",
      "floor": "f2",
      "a": [
        9.8,
        -6.9
      ],
      "b": [
        14.1,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 1.8,
          "width": 1.2,
          "height": 2.2,
          "sill": 0,
          "kind": "open-passage"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 2: 1.20 m opening at the west edge of dressing-room frontage; bedroom 201 has no direct door to bathroom 205."
    },
    {
      "id": "f2-dressing-west",
      "floor": "f2",
      "a": [
        11.6,
        -10.3
      ],
      "b": [
        11.6,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [
        {
          "offset": 1.95,
          "width": 0.8,
          "height": 2.05,
          "sill": 0,
          "kind": "door",
          "hingeSide": "end",
          "swingInto": "f2-205-bath"
        }
      ],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed",
      "reviewNote": "Plan page 2: bathroom 205 is accessed from dressing room 201/1 through its east wall."
    },
    {
      "id": "f2-bath-west",
      "floor": "f2",
      "a": [
        9.65,
        -10.3
      ],
      "b": [
        9.65,
        -6.9
      ],
      "exterior": false,
      "height": 2.7,
      "thickness": 0.1,
      "openings": [],
      "evidenceStatus": "derived",
      "verticalStatus": "assumed"
    }
  ],
  "assumptions": {
    "wallHeight": 2.7,
    "slabThickness": 0.18,
    "exteriorWallThickness": 0.15,
    "interiorWallThickness": 0.1,
    "cutawayHeight": 0.9
  },
  "roof": {
    "style": "hipped",
    "height": 1.2,
    "overhang": 0.35,
    "status": "assumed",
    "solarPanels": {
      "visible": true,
      "exactCount": null,
      "status": "source_observed",
      "ownership": "owner-confirmed",
      "placementStatus": "assumed"
    }
  },
  "stair": {
    "floor": "f1",
    "bounds": [
      5.5,
      -10.3,
      8.5,
      -6.9
    ],
    "holePolygon": [
      [
        5.5,
        -10.3
      ],
      [
        8.5,
        -10.3
      ],
      [
        8.5,
        -7.4
      ],
      [
        5.5,
        -7.4
      ]
    ],
    "status": "derived",
    "stepCount": 20,
    "stepCountStatus": "assumed"
  },
  "calibrations": [
    {
      "id": "cal-f1-v1",
      "sourceId": "SRC-PLAN",
      "page": 1,
      "rasterSize": [
        2600,
        1839
      ],
      "rotationClockwiseDeg": 90,
      "cropPx": null,
      "controlPoints": [
        {
          "id": "f1-cp1",
          "pixelXY": [
            714.72,
            537.08
          ],
          "worldXZ": [
            0,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp2",
          "pixelXY": [
            979.13,
            528.81
          ],
          "worldXZ": [
            3.3,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp3",
          "pixelXY": [
            1152.65,
            524.68
          ],
          "worldXZ": [
            5.5,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp4",
          "pixelXY": [
            1392.27,
            517.8
          ],
          "worldXZ": [
            8.5,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp5",
          "pixelXY": [
            1498.31,
            515.04
          ],
          "worldXZ": [
            9.8,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp6",
          "pixelXY": [
            1828.81,
            505.4
          ],
          "worldXZ": [
            14.1,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp7",
          "pixelXY": [
            720.23,
            804.24
          ],
          "worldXZ": [
            0,
            -6.9
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp8",
          "pixelXY": [
            1838.45,
            773.94
          ],
          "worldXZ": [
            14.1,
            -6.9
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp9",
          "pixelXY": [
            724.36,
            937.82
          ],
          "worldXZ": [
            0,
            -5.2
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp10",
          "pixelXY": [
            1843.96,
            908.9
          ],
          "worldXZ": [
            14.1,
            -5.2
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp11",
          "pixelXY": [
            727.12,
            1071.4
          ],
          "worldXZ": [
            0,
            -3.5
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp12",
          "pixelXY": [
            1849.47,
            1043.86
          ],
          "worldXZ": [
            14.1,
            -3.5
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp13",
          "pixelXY": [
            731.25,
            1220.13
          ],
          "worldXZ": [
            0,
            -1.6
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp14",
          "pixelXY": [
            1853.6,
            1193.96
          ],
          "worldXZ": [
            14.1,
            -1.6
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp15",
          "pixelXY": [
            734,
            1341.31
          ],
          "worldXZ": [
            0,
            0
          ],
          "quality": "clear"
        },
        {
          "id": "f1-cp16",
          "pixelXY": [
            1857.73,
            1309.64
          ],
          "worldXZ": [
            14.1,
            0
          ],
          "quality": "clear"
        }
      ],
      "worldToRaster3x3": [
        79.44872920055813,
        1.9600161584600333,
        735.0131882010055,
        -2.0846970666039812,
        78.46395439888319,
        1344.6935820500232,
        0,
        0,
        1
      ],
      "residualMetres": 0.0815,
      "rmsResidualMetres": 0.0428,
      "reviewStatus": "draft",
      "note": "Manually observed scan controls; affine fit measures trace consistency only, not as-built accuracy."
    },
    {
      "id": "cal-f2-v1",
      "sourceId": "SRC-PLAN",
      "page": 2,
      "rasterSize": [
        2600,
        1839
      ],
      "rotationClockwiseDeg": 90,
      "cropPx": null,
      "controlPoints": [
        {
          "id": "f2-cp1",
          "pixelXY": [
            691.31,
            570.13
          ],
          "worldXZ": [
            0,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp2",
          "pixelXY": [
            950.21,
            568.75
          ],
          "worldXZ": [
            3.3,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp3",
          "pixelXY": [
            1123.73,
            568.75
          ],
          "worldXZ": [
            5.5,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp4",
          "pixelXY": [
            1360.59,
            568.75
          ],
          "worldXZ": [
            8.5,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp5",
          "pixelXY": [
            1463.88,
            568.75
          ],
          "worldXZ": [
            9.8,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp6",
          "pixelXY": [
            1802.65,
            567.37
          ],
          "worldXZ": [
            14.1,
            -10.3
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp7",
          "pixelXY": [
            692.69,
            833.16
          ],
          "worldXZ": [
            0,
            -6.9
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp8",
          "pixelXY": [
            1805.4,
            830.4
          ],
          "worldXZ": [
            14.1,
            -6.9
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp9",
          "pixelXY": [
            692.69,
            965.36
          ],
          "worldXZ": [
            0,
            -5.2
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp10",
          "pixelXY": [
            1806.78,
            962.61
          ],
          "worldXZ": [
            14.1,
            -5.2
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp11",
          "pixelXY": [
            692.69,
            1098.94
          ],
          "worldXZ": [
            0,
            -3.5
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp12",
          "pixelXY": [
            1808.16,
            1094.81
          ],
          "worldXZ": [
            14.1,
            -3.5
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp13",
          "pixelXY": [
            692.69,
            1246.29
          ],
          "worldXZ": [
            0,
            -1.6
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp14",
          "pixelXY": [
            1809.53,
            1238.03
          ],
          "worldXZ": [
            14.1,
            -1.6
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp15",
          "pixelXY": [
            691.31,
            1370.23
          ],
          "worldXZ": [
            0,
            0
          ],
          "quality": "clear"
        },
        {
          "id": "f2-cp16",
          "pixelXY": [
            1809.53,
            1364.72
          ],
          "worldXZ": [
            14.1,
            0
          ],
          "quality": "clear"
        }
      ],
      "worldToRaster3x3": [
        79.0608026004856,
        0.45087456571755424,
        694.1336509344486,
        -0.29647406895402895,
        77.52620624859732,
        1369.262017460187,
        0,
        0,
        1
      ],
      "residualMetres": 0.0425,
      "rmsResidualMetres": 0.0206,
      "reviewStatus": "draft",
      "note": "Manually observed scan controls; affine fit measures trace consistency only, not as-built accuracy."
    }
  ],
  "geometryStatus": "draft-calibrated-trace",
  "description": "โมเดลจำลองจากแปลนและภาพอ้างอิง ความสูงผนัง หลังคา และรายละเอียดบางส่วนเป็นค่าประมาณ",
  "sourceCounts": {
    "planPages": 2,
    "photographs": 26
  },
  "photoBindings": [
    {
      "photoSetId": "photos-bedroom",
      "spaceId": "f2-201-bedroom",
      "status": "confirmed",
      "method": "owner-confirmed",
      "reviewedBy": "owner",
      "reviewedAt": "2026-09-24",
      "evidence": [
        {
          "sourceId": "OWNER-REVIEW",
          "note": "Owner identified bedroom 201 and its headboard direction; bedrooms 202 and 203 have no photographs."
        }
      ]
    },
    {
      "photoSetId": "photos-study",
      "spaceId": "f2-204-1-lounge",
      "status": "confirmed",
      "method": "owner-confirmed",
      "reviewedBy": "owner",
      "reviewedAt": "2026-09-24",
      "evidence": [
        {
          "sourceId": "OWNER-REVIEW",
          "note": "Owner identified the upstairs lounge, with the sofa beside bedroom 201 and computers beside bedroom 202."
        }
      ]
    },
    {
      "photoSetId": "photos-stair-chandelier",
      "spaceId": "f2-204-hall",
      "status": "confirmed",
      "method": "owner-confirmed",
      "reviewedBy": "owner",
      "reviewedAt": "2026-09-24",
      "evidence": [
        {
          "sourceId": "OWNER-REVIEW",
          "note": "Owner identified the eight-ring crystal chandelier in the stair hall and supplied a contextual view from the upstairs lounge."
        }
      ]
    }
  ]
};
