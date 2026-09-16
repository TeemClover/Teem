// Server metadata only. This public repository contains no paid video, captions, or document body.
// Media IDs identify assets; they grant no access. Every delivery requires server-side entitlement.
// All /learn lessons require purchased or instructor access. The email-gated trial lives at /classroom/.
export const LEARN_COURSES = [
  {
    "id": "ai-sauce",
    "title": "AI ใส่ซอส",
    "coverImage": "/learn/assets/course-covers/ai-sauce-v5.webp",
    "description": "เรียนต่อเนื่องจากวิธีคิด สู่การดูครูทำและลงมือฝึก นำซอสของคุณไปสร้างภาพ วิดีโอ งานหลายรูปแบบ สูตรคำสั่ง และเว็บ ก่อนลองเคสสำนักงาน ธุรกิจ และการต่อยอดเป็นระบบ",
    "startLessonId": "FOUNDATION",
    "previewLessonId": null,
    "mainLessonIds": [
      "FOUNDATION",
      "ADV01",
      "ADV02",
      "ADV03",
      "ADV04",
      "ADV05",
      "CH06"
    ],
    "applicationLessonIds": [
      "EP13",
      "EP14"
    ],
    "sections": [
      {
        "id": "foundation",
        "label": "บทนำ",
        "title": "เลือกเครื่องครัว แล้วเปิดเตา",
        "summary": "เข้าใจวิธีคิด แล้วเลือกงานที่จะพา AI มาช่วย",
        "lessonIds": [
          "FOUNDATION",
          "EP01",
          "TOOLKIT"
        ]
      },
      {
        "id": "ch01",
        "label": "บท 1",
        "title": "เริ่มจากการปรุงซอส",
        "summary": "รวบรวมข้อมูล ดูครูสกัดซอส แล้วเก็บซอสขวดแรกของคุณ",
        "lessonIds": [
          "EP02",
          "ADV01",
          "EP03"
        ]
      },
      {
        "id": "ch02",
        "label": "บท 2",
        "title": "ชิมซอสก่อนเติม",
        "summary": "ตรวจงานร่าง ทดลองทำภาพ แล้วเติมสิ่งที่เรียนรู้กลับลงซอส",
        "lessonIds": [
          "EP04",
          "ADV02",
          "EP05"
        ]
      },
      {
        "id": "ch03",
        "label": "บท 3",
        "title": "เอาซอสไปทำจานจริง",
        "summary": "ตั้งโจทย์ ฝึกทำงานหนึ่งชิ้น แล้วดูการต่อยอดเป็นวิดีโอ",
        "lessonIds": [
          "EP06",
          "EP07",
          "ADV03"
        ]
      },
      {
        "id": "ch04",
        "label": "บท 4",
        "title": "ซอสขวดเดียว แตกได้หลายเมนู",
        "summary": "นำข้อมูลเดียวกันไปทำงานหลายรูปแบบ โดยรักษาข้อเท็จจริง",
        "lessonIds": [
          "EP08",
          "ADV04",
          "EP09"
        ]
      },
      {
        "id": "ch05",
        "label": "บท 5",
        "title": "เลือกงาน แล้วตักผงไปใช้กับซอส",
        "summary": "เลือกคำสั่งให้ตรงงาน เก็บสูตร และอัปเดตซอสเมื่อข้อมูลเปลี่ยน",
        "lessonIds": [
          "ADV05",
          "EP10",
          "EP11"
        ]
      },
      {
        "id": "ch06",
        "label": "บท 6",
        "title": "เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต",
        "summary": "ดูครูสร้างหน้าเว็บ แล้วฝึกเปิดและส่งชุดงานให้คนอื่นใช้ต่อ",
        "lessonIds": [
          "CH06",
          "EP12"
        ]
      },
      {
        "id": "applications",
        "label": "ฝึกกับงานจริง",
        "title": "ใช้ครบหกขั้นกับงานสำนักงานและธุรกิจ",
        "summary": "ลองสองเคสตัวอย่าง แล้วนำวิธีไปใช้กับข้อมูลของคุณ",
        "lessonIds": [
          "EP13",
          "EP14"
        ]
      },
      {
        "id": "finale",
        "label": "บทส่งท้าย",
        "title": "จากซอสหนึ่งขวด สู่โลกที่คุณสร้างได้",
        "summary": "เห็นภาพปลายทาง รวบรวมผลงาน และเลือกสิ่งที่อยากสร้างต่อ",
        "lessonIds": [
          "DUNGEON"
        ]
      }
    ],
    "resourceAccess": "active_entitlement_required",
    "lessons": [
      {
        "id": "FOUNDATION",
        "title": "เริ่มจากคลาสจริง: เลือกเครื่องมือและเข้าใจซอส",
        "type": "foundation",
        "sectionId": "foundation",
        "section": "บทนำ · เลือกเครื่องครัว แล้วเปิดเตา",
        "order": 0,
        "durationSeconds": 234.067,
        "preview": false,
        "mediaId": "m_6d24ea3d11d85502b855151525f0c175",
        "captionId": "m_85b6093412e2560d8647c996e1fe1c97",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_1186a629f49d5b2b976252e90a381563"
        ],
        "additionalResourceIds": [
          "m_8376c8da70985157bbc0aed2dac85534",
          "m_bcf8dce06e4d57d0a8b4a08b3bfe9ef6",
          "m_d330205d1b05586ebdf9bebb519223cd"
        ],
        "summary": "เข้าใจซอส ก่อนเริ่มทำ ซอส ของคุณ",
        "outcome": "เข้าใจซอส ก่อนเริ่มทำ ซอส ของคุณ",
        "nextLessonId": "EP01",
        "partLabel": "เข้าใจหลัก",
        "showcase": [
          {
            "assetId": "m_8376c8da70985157bbc0aed2dac85534",
            "title": "ภาพจากซอสของคุณ",
            "description": "จากข้อมูลจริงของครู สู่ภาพที่สะท้อนตัวตน"
          },
          {
            "assetId": "m_bcf8dce06e4d57d0a8b4a08b3bfe9ef6",
            "title": "ซอสที่กลายเป็นหน้าเว็บ",
            "description": "ตัวอย่างหน้าเว็บที่ครูสร้างและเปิดดูระหว่างสอน"
          },
          {
            "assetId": "m_d330205d1b05586ebdf9bebb519223cd",
            "title": "ข้อมูลที่กลายเป็นโลกให้คนเล่น",
            "description": "ต่อยอดเป็นเกมที่มีกติกาและประสบการณ์ให้คนลอง"
          }
        ]
      },
      {
        "id": "EP01",
        "title": "เริ่มจากซอส: ให้ AI รู้จักงานของคุณ",
        "type": "support",
        "sectionId": "foundation",
        "section": "บทนำ · เลือกเครื่องครัว แล้วเปิดเตา",
        "order": 1,
        "durationSeconds": 27.433333333333334,
        "preview": false,
        "mediaId": "m_dfa69d78bee75457a741e485b1860914",
        "captionId": "m_d4bbd64f85e85afd8bd884486b16192d",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_68c3bd42105d5cca9a1a802e335d1fb8"
        ],
        "additionalResourceIds": [],
        "summary": "เลือกงานหนึ่งเรื่อง แล้วเตรียมข้อมูลต้นทางให้ AI ใช้กับงานนั้น",
        "outcome": "เลือกงานหนึ่งเรื่อง แล้วเตรียมข้อมูลต้นทางให้ AI ใช้กับงานนั้น",
        "nextLessonId": "TOOLKIT",
        "partLabel": "เตรียมลงมือ"
      },
      {
        "id": "TOOLKIT",
        "title": "เตรียมชุดเครื่องมือก่อนลงมือ",
        "type": "toolkit",
        "sectionId": "foundation",
        "section": "บทนำ · เลือกเครื่องครัว แล้วเปิดเตา",
        "order": 2,
        "preview": false,
        "resourceIds": [],
        "additionalResourceIds": [],
        "summary": "หยิบคู่มือกับผู้ช่วยงานตามสิทธิ์ของคุณ แล้วเปิดสมุดงาน เตรียมซอสและไฟล์ฝึกไว้ใช้ต่อในบท 1",
        "outcome": "รู้ว่าจะเปิดสมุดงานและหยิบไฟล์ไหนมาใช้ระหว่างเรียน",
        "nextLessonId": "EP02",
        "partLabel": "เตรียมเครื่องมือ"
      },
      {
        "id": "EP02",
        "title": "เอาความรู้ออกจากเสียง ไฟล์ และแชต",
        "type": "support",
        "sectionId": "ch01",
        "section": "บท 1 · เริ่มจากการปรุงซอส",
        "order": 3,
        "durationSeconds": 80.033333,
        "preview": false,
        "mediaId": "m_45a9e0e2e7b15de5bbc9faf1202814d6",
        "captionId": "m_91d2f7e9b7295dd1b09b72cc3357c885",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_2f22900ffa6e4e37cf775b77aa93e459"
        ],
        "additionalResourceIds": [],
        "summary": "แยกข้อมูลที่ยืนยันแล้วออกจากคำขอและข้อสันนิษฐานในเสียง ไฟล์ และแชต",
        "outcome": "แยกข้อมูลที่ยืนยันแล้วออกจากคำขอและข้อสันนิษฐานในเสียง ไฟล์ และแชต",
        "nextLessonId": "ADV01",
        "partLabel": "เตรียมข้อมูล"
      },
      {
        "id": "ADV01",
        "title": "สกัดซอส เก็บเป็นไฟล์ แล้วตรวจให้ตรงตัวเรา",
        "type": "main",
        "sectionId": "ch01",
        "section": "บท 1 · เริ่มจากการปรุงซอส",
        "order": 4,
        "durationSeconds": 171.9,
        "preview": false,
        "mediaId": "m_1a0c67647bfe55478316a77cd0266b6f",
        "captionId": "m_b4109cb188f5593da04023f53fe9cc68",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_1495db5162b2602a050af9b3872fd87c"
        ],
        "additionalResourceIds": [],
        "summary": "เก็บ ซอส .md ที่ตรวจแล้ว",
        "outcome": "เก็บ ซอส .md ที่ตรวจแล้ว",
        "nextLessonId": "EP03",
        "partLabel": "ดูครูทำ"
      },
      {
        "id": "EP03",
        "title": "ทำซอสขวดแรกที่เปิดใช้ต่อได้",
        "type": "support",
        "sectionId": "ch01",
        "section": "บท 1 · เริ่มจากการปรุงซอส",
        "order": 5,
        "durationSeconds": 76.6,
        "preview": false,
        "mediaId": "m_aae7b49b41185959b62af20910581624",
        "captionId": "m_049ad1c543655221a912659934072e6d",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_44689d546ea5e654aa2258be66e955ac"
        ],
        "additionalResourceIds": [],
        "summary": "ทำ ซอส ฉบับแรกที่บันทึกและเปิดใช้ต่อได้ พร้อมที่มาและสิ่งที่ยังไม่รู้",
        "outcome": "ทำ ซอส ฉบับแรกที่บันทึกและเปิดใช้ต่อได้ พร้อมที่มาและสิ่งที่ยังไม่รู้",
        "nextLessonId": "EP04",
        "partLabel": "ลงมือทำ"
      },
      {
        "id": "EP04",
        "title": "ชิมงานแรก: ดูให้ออกว่าขาดอะไร",
        "type": "support",
        "sectionId": "ch02",
        "section": "บท 2 · ชิมซอสก่อนเติม",
        "order": 6,
        "durationSeconds": 48.733333,
        "preview": false,
        "mediaId": "m_1df832c402ba5a668eb3cadeffc7372a",
        "captionId": "m_95fb7821183a5622acb00c9fef066df6",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_7f5c461159c0921746bb1db9526ac977"
        ],
        "additionalResourceIds": [],
        "summary": "ตรวจร่างก่อนใช้ โดยมองหาข้อมูลที่ขาดและคำรับปากเกินข้อเท็จจริง",
        "outcome": "ตรวจร่างก่อนใช้ โดยมองหาข้อมูลที่ขาดและคำรับปากเกินข้อเท็จจริง",
        "nextLessonId": "ADV02",
        "partLabel": "เข้าใจหลัก"
      },
      {
        "id": "ADV02",
        "title": "ชิมซอสด้วยภาพ แล้วเลือกภาพไปทำต่อ",
        "type": "main",
        "sectionId": "ch02",
        "section": "บท 2 · ชิมซอสก่อนเติม",
        "order": 7,
        "durationSeconds": 228.06666666666666,
        "preview": false,
        "mediaId": "m_f42016ac75555ddaa241c6c8d8b3e07c",
        "captionId": "m_741abadfc9df56958f04ac58ab30b509",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_9c4176f408aaba2e7b85fd09cd8e0639"
        ],
        "additionalResourceIds": [],
        "summary": "เก็บซอสภาพ + ภาพที่เลือก",
        "outcome": "เก็บซอสภาพ + ภาพที่เลือก",
        "nextLessonId": "EP05",
        "partLabel": "ดูครูทำภาพ"
      },
      {
        "id": "EP05",
        "title": "แก้ให้ตรงจุด แล้วเติมกลับลงซอส",
        "type": "support",
        "sectionId": "ch02",
        "section": "บท 2 · ชิมซอสก่อนเติม",
        "order": 8,
        "durationSeconds": 32.7,
        "preview": false,
        "mediaId": "m_eb46fe6665c557478016a193bb523b84",
        "captionId": "m_55803610be76592fbbd1f53f544a86af",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_d7f53767787352ad9622c5a390197fb6"
        ],
        "additionalResourceIds": [],
        "summary": "ชี้จุดแก้ให้ชัด แล้วแยกข้อมูลใช้ซ้ำกลับไปเก็บใน ซอส",
        "outcome": "ชี้จุดแก้ให้ชัด แล้วแยกข้อมูลใช้ซ้ำกลับไปเก็บใน ซอส",
        "nextLessonId": "EP06",
        "partLabel": "ทดลองแก้"
      },
      {
        "id": "EP06",
        "title": "บอกโจทย์รอบนี้ให้ชัด",
        "type": "support",
        "sectionId": "ch03",
        "section": "บท 3 · เอาซอสไปทำจานจริง",
        "order": 9,
        "durationSeconds": 18,
        "preview": false,
        "mediaId": "m_a26a78e002f453909a8829215ab11b46",
        "captionId": "m_6762be17ad8754a1a78b951d446f0be9",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_7f8af56dbc4d5f58966a2af65cd62b6a"
        ],
        "additionalResourceIds": [],
        "summary": "แยกข้อมูลประจำงานออกจากบรีฟของงานรอบนี้",
        "outcome": "แยกข้อมูลประจำงานออกจากบรีฟของงานรอบนี้",
        "nextLessonId": "EP07",
        "partLabel": "ตั้งโจทย์"
      },
      {
        "id": "EP07",
        "title": "ทดลองทำงานชิ้นแรกจากซอสของคุณ",
        "type": "support",
        "sectionId": "ch03",
        "section": "บท 3 · เอาซอสไปทำจานจริง",
        "order": 10,
        "durationSeconds": 108.633333,
        "preview": false,
        "mediaId": "m_40e6d08596565db085403b903be838b0",
        "captionId": "m_4080c6c04ee350929316166c3137277c",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_40c75725def15dc1a2e1d774e3b64d34"
        ],
        "additionalResourceIds": [],
        "summary": "ฝึกแนบข้อมูล ตรวจร่าง และสั่งแก้จากตัวอย่างงานสำนักงานที่เตรียมไว้",
        "outcome": "ฝึกแนบข้อมูล ตรวจร่าง และสั่งแก้จากตัวอย่างงานสำนักงานที่เตรียมไว้",
        "nextLessonId": "ADV03",
        "partLabel": "ทดลองทำงาน"
      },
      {
        "id": "ADV03",
        "title": "ผสมซอสกับภาพ แล้วสร้างวิดีโอ",
        "type": "main",
        "sectionId": "ch03",
        "section": "บท 3 · เอาซอสไปทำจานจริง",
        "order": 11,
        "durationSeconds": 204.533,
        "preview": false,
        "mediaId": "m_18cf233240e3509bb836f9354c1bf87f",
        "captionId": "m_fcbe6af0d5a45bf98144caed8fbc66f5",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_91cbe15dbd7a52fade47a516330901ca"
        ],
        "additionalResourceIds": [],
        "summary": "เก็บซอสวิดีโอ + คลิปที่ตรวจแล้ว",
        "outcome": "เก็บซอสวิดีโอ + คลิปที่ตรวจแล้ว",
        "nextLessonId": "EP08",
        "partLabel": "ดูครูทำวิดีโอ"
      },
      {
        "id": "EP08",
        "title": "ซอสขวดเดียว ทำงานได้หลายแบบ",
        "type": "support",
        "sectionId": "ch04",
        "section": "บท 4 · ซอสขวดเดียว แตกได้หลายเมนู",
        "order": 12,
        "durationSeconds": 38.633333,
        "preview": false,
        "mediaId": "m_d94ca9bc345a5f79a8acbd8983b3fe60",
        "captionId": "m_10a7e714694c5aed900041c49513acc3",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_436a91bd0a246293468e43a64a11f1d8"
        ],
        "additionalResourceIds": [],
        "summary": "ใช้ต้นทางเดียวกันทำงานหลายรูปแบบให้เหมาะกับผู้รับ",
        "outcome": "ใช้ต้นทางเดียวกันทำงานหลายรูปแบบให้เหมาะกับผู้รับ",
        "nextLessonId": "ADV04",
        "partLabel": "เข้าใจหลัก"
      },
      {
        "id": "ADV04",
        "title": "ใช้ซอสเดียวแตกงาน แล้วชิมผลก่อนส่งต่อ",
        "type": "main",
        "sectionId": "ch04",
        "section": "บท 4 · ซอสขวดเดียว แตกได้หลายเมนู",
        "order": 13,
        "durationSeconds": 181.267,
        "preview": false,
        "mediaId": "m_f2676fb75a0b5537a07abc56aff888d1",
        "captionId": "m_f6bd8f20ea575905b5da1c882f1b44cf",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_a71fa3f0e10db1f513f1a26ffa438d68"
        ],
        "additionalResourceIds": [
          "m_dcd9abbbefe457e8b7820319bb8affe1"
        ],
        "summary": "เก็บชิ้นงานคู่กับ ซอส ต้นทาง",
        "outcome": "เก็บชิ้นงานคู่กับ ซอส ต้นทาง",
        "nextLessonId": "EP09",
        "partLabel": "ดูครูแตกงาน"
      },
      {
        "id": "EP09",
        "title": "เปลี่ยนรูปแบบ โดยไม่เปลี่ยนข้อเท็จจริง",
        "type": "support",
        "sectionId": "ch04",
        "section": "บท 4 · ซอสขวดเดียว แตกได้หลายเมนู",
        "order": 14,
        "durationSeconds": 26.133333,
        "preview": false,
        "mediaId": "m_a47d672601445e54b13e1525a073f9ba",
        "captionId": "m_9adff3b4aa135d238728d78000d763fa",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_033754b1819c8545fd0189a72a121cfc"
        ],
        "additionalResourceIds": [],
        "summary": "ตรวจว่าข้อเท็จจริงและสถานะยังตรงกันเมื่อเปลี่ยนรูปแบบงาน",
        "outcome": "ตรวจว่าข้อเท็จจริงและสถานะยังตรงกันเมื่อเปลี่ยนรูปแบบงาน",
        "nextLessonId": "ADV05",
        "partLabel": "ลงมือตรวจ"
      },
      {
        "id": "ADV05",
        "title": "เลือกและผสมคำสั่งให้ซอสตรงงาน",
        "type": "main",
        "sectionId": "ch05",
        "section": "บท 5 · เลือกงาน แล้วตักผงไปใช้กับซอส",
        "order": 15,
        "durationSeconds": 195.46666666666667,
        "preview": false,
        "mediaId": "m_08098d73bcb450aab59f8e509d85470e",
        "captionId": "m_3bc9702adba2515388ffb96e583d3fe9",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_5aa0f68bf0caedecd2285197edb3471a"
        ],
        "additionalResourceIds": [],
        "summary": "ชิ้นงาน: สูตรที่ปรับแล้ว + ซอส",
        "outcome": "ชิ้นงาน: สูตรที่ปรับแล้ว + ซอส",
        "nextLessonId": "EP10",
        "partLabel": "ดูครูเลือกคำสั่ง"
      },
      {
        "id": "EP10",
        "title": "เก็บสูตรประจำงานให้หยิบใช้ได้",
        "type": "support",
        "sectionId": "ch05",
        "section": "บท 5 · เลือกงาน แล้วตักผงไปใช้กับซอส",
        "order": 16,
        "durationSeconds": 24.666666666666668,
        "preview": false,
        "mediaId": "m_8ca75051f5bf56c38fad903d7d690c23",
        "captionId": "m_8bec6fe775ba530e95f0ad0433e84b4c",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_1df526f8487e1850196421ed86e69fd5"
        ],
        "additionalResourceIds": [],
        "summary": "เก็บวิธีทำที่ใช้ซ้ำเป็นสูตรประจำงาน",
        "outcome": "เก็บวิธีทำที่ใช้ซ้ำเป็นสูตรประจำงาน",
        "nextLessonId": "EP11",
        "partLabel": "เก็บสูตรของคุณ"
      },
      {
        "id": "EP11",
        "title": "ข้อมูลเปลี่ยน ก็ปรับซอสให้ทัน",
        "type": "support",
        "sectionId": "ch05",
        "section": "บท 5 · เลือกงาน แล้วตักผงไปใช้กับซอส",
        "order": 17,
        "durationSeconds": 65.733333,
        "preview": false,
        "mediaId": "m_614f4629d6df5d01961067b872d219e0",
        "captionId": "m_5ebda43ee5055513a543eb78c590644c",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_5e96b067fcade0044d43a1c56b1ec2eb"
        ],
        "additionalResourceIds": [],
        "summary": "อัปเดต ซอส และงานที่เกี่ยวข้องเมื่อได้รับข้อมูลใหม่",
        "outcome": "อัปเดต ซอส และงานที่เกี่ยวข้องเมื่อได้รับข้อมูลใหม่",
        "nextLessonId": "CH06",
        "partLabel": "ฝึกอัปเดต"
      },
      {
        "id": "CH06",
        "title": "สร้างหน้าเว็บจากซอส แล้วปรับใน HTML Preview",
        "type": "main",
        "sectionId": "ch06",
        "section": "บท 6 · เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต",
        "order": 18,
        "durationSeconds": 227.8,
        "preview": false,
        "mediaId": "m_131fb4ef6b45519284bb0d00d5f676b6",
        "captionId": "m_3ee03baa3b14555db2fa2347c93ae6f2",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_f16475085a17a612744466e3a0a63a03"
        ],
        "additionalResourceIds": [],
        "summary": "ดูการสร้างและปรับหน้าเว็บจากข้อมูลที่เตรียมไว้ แล้วเก็บไฟล์ไปเปิดใช้ต่อ",
        "outcome": "ได้แนวทางเปลี่ยนซอสเป็นหน้าเว็บและปรับงานจากสิ่งที่เห็น",
        "nextLessonId": "EP12",
        "partLabel": "ดูครูทำเว็บ"
      },
      {
        "id": "EP12",
        "title": "ส่งทั้งงานและซอส ให้คนอื่นทำต่อ",
        "type": "support",
        "sectionId": "ch06",
        "section": "บท 6 · เปลี่ยนซอสเป็น HTML ไฟล์มีชีวิต",
        "order": 19,
        "durationSeconds": 88.733333,
        "preview": false,
        "mediaId": "m_574dee5df795586e9c0019aa509eacc6",
        "captionId": "m_c51bd8995b635e508c4328efd5c6e085",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_69578d48dc40a25f754f171031c4ba08"
        ],
        "additionalResourceIds": [],
        "summary": "ฝึกเปิดและส่งชุด HTML พร้อมไฟล์ประกอบให้ผู้รับใช้งานต่อ",
        "outcome": "ฝึกเปิดและส่งชุด HTML พร้อมไฟล์ประกอบให้ผู้รับใช้งานต่อ",
        "nextLessonId": "EP13",
        "partLabel": "ฝึกส่งงาน"
      },
      {
        "id": "EP13",
        "title": "พาทำงานสำนักงาน: อัปเดตทีม อีเมล และรายการงาน",
        "type": "case",
        "sectionId": "applications",
        "section": "ฝึกกับงานจริง · ใช้ครบหกขั้นกับงานสำนักงานและธุรกิจ",
        "order": 20,
        "durationSeconds": 52.233333,
        "preview": false,
        "mediaId": "m_75e19bb5e91457a29dd717cf774b7ac8",
        "captionId": "m_b451637d7581551583a6722742976388",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_5930398987efcf38ff0cca1acdc1e609"
        ],
        "additionalResourceIds": [],
        "summary": "ประยุกต์หกขั้นกับอัปเดตทีม อีเมล และรายการงานในเคสสำนักงานสมมติ",
        "outcome": "ประยุกต์หกขั้นกับอัปเดตทีม อีเมล และรายการงานในเคสสำนักงานสมมติ",
        "nextLessonId": "EP14",
        "partLabel": "เคสสำนักงาน"
      },
      {
        "id": "EP14",
        "title": "พาทำงานธุรกิจ: โพสต์ ตอบลูกค้า และข้อเสนอ",
        "type": "case",
        "sectionId": "applications",
        "section": "ฝึกกับงานจริง · ใช้ครบหกขั้นกับงานสำนักงานและธุรกิจ",
        "order": 21,
        "durationSeconds": 80.767,
        "preview": false,
        "mediaId": "m_f4c66e8beddbcc8b181ca1644921b9b9",
        "captionId": "m_324c2d1ee348b75bfe5bf2b0cd017452",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_c2c05257a943577ab0ae74fcc0ed5f6d"
        ],
        "additionalResourceIds": [],
        "summary": "ประยุกต์หกขั้นกับโพสต์ คำตอบลูกค้า และข้อเสนอในเคสธุรกิจสมมติ",
        "outcome": "ประยุกต์หกขั้นกับโพสต์ คำตอบลูกค้า และข้อเสนอในเคสธุรกิจสมมติ",
        "nextLessonId": "DUNGEON",
        "partLabel": "เคสธุรกิจ"
      },
      {
        "id": "DUNGEON",
        "title": "จากซอสหนึ่งขวด สู่โลกที่คุณสร้างได้",
        "type": "main",
        "preview": false,
        "durationSeconds": 428.1,
        "mediaId": "m_4ae404912e3ed1f49df2a4ddad1832a5",
        "captionId": "m_2824b84b7bb015cda9a0efa062b90f86",
        "captionsEmbedded": true,
        "resourceIds": [
          "m_958d2c0d7b3253d3ad9a047157507915"
        ],
        "additionalResourceIds": [],
        "summary": "ดูตัวอย่างการต่อยอดเป็นประสบการณ์ที่กดใช้งานได้ แล้ววางแผนสร้างสิ่งที่ช่วยงานของคุณ",
        "outcome": "เชื่อมข้อมูล ไฟล์ และกติกาเป็นระบบเล็ก ๆ พร้อมเลือกงานที่จะลงมือทำต่อ",
        "sectionId": "finale",
        "section": "บทส่งท้าย · จากซอสหนึ่งขวด สู่โลกที่คุณสร้างได้",
        "partLabel": "ต่อยอดและลงมือสร้าง",
        "order": 22,
        "nextLessonId": null,
        "finale": true,
        "activityUrl": "/classroom/dungeon/"
      }
    ],
    "resources": [
      {
        "id": "m_bd8f96e3ed5d5831a9a993fb5c598000",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP01",
          "FOUNDATION"
        ],
        "kind": "resource",
        "title": "MY_WORK_SOURCE_TEMPLATE.md",
        "filename": "MY_WORK_SOURCE_TEMPLATE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1848,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_556f437dd27c5560bc613e9d18903d5a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP01",
          "FOUNDATION"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP01_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 888,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_99ede3d3957454ac94f1739fcdfa5d44",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02"
        ],
        "kind": "resource",
        "title": "01_VOICE_NOTE_SAMPLE.md",
        "filename": "01_VOICE_NOTE_SAMPLE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1178,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_df566f944ab558d69391e9e12fa413b5",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02"
        ],
        "kind": "resource",
        "title": "02_MENU_SAMPLE.csv",
        "filename": "02_MENU_SAMPLE.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 281,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_a3c56ed2968754a7a0c58177129c281d",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02"
        ],
        "kind": "resource",
        "title": "03_CUSTOMER_CHAT_SAMPLE.md",
        "filename": "03_CUSTOMER_CHAT_SAMPLE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1322,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_cca4e1bba07252549a4f30a122d1c9d4",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02"
        ],
        "kind": "resource",
        "title": "04_EXTRACT_REQUEST.md",
        "filename": "04_EXTRACT_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1789,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_db181e10acbf58d88569bf080f9f4d33",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02"
        ],
        "kind": "resource",
        "title": "05_SOURCE_SAMPLE_v01.md",
        "filename": "05_SOURCE_SAMPLE_v01.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3648,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_56759fc8a0565fa59af8c9c7423f0dc1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02",
          "ADV01"
        ],
        "kind": "resource",
        "title": "EP02_EXAMPLE_FILES.zip",
        "filename": "EP02_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 3469,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_038c6592d9fc51b2b9b00d19f35c4614",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP02",
          "ADV01"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP02_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 3715,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d6c2a2dcb29f58319c10d7203242a2c0",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03"
        ],
        "kind": "resource",
        "title": "BAKERY_SOURCE_v01.md",
        "filename": "BAKERY_SOURCE_v01.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3847,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_5e9b4446fced5968be361ef105481b3e",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03"
        ],
        "kind": "resource",
        "title": "BAKERY_SOURCE_v02.md",
        "filename": "BAKERY_SOURCE_v02.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 12471,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_5ffc0acee1725f30a61003198c63a979",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03"
        ],
        "kind": "resource",
        "title": "CHANGELOG_v01_to_v02.md",
        "filename": "CHANGELOG_v01_to_v02.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2255,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_22693386832f5820937a49a4df9385a5",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03",
          "ADV01"
        ],
        "kind": "resource",
        "title": "MY_WORK_SOURCE_TEMPLATE.md",
        "filename": "MY_WORK_SOURCE_TEMPLATE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1848,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_c1b9c7a27d61543e8e8a080650ad0a0f",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03"
        ],
        "kind": "resource",
        "title": "OPEN_EDIT_USE.md",
        "filename": "OPEN_EDIT_USE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2906,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_41aeb9ff11705c7a9c107f724cd2f292",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03"
        ],
        "kind": "resource",
        "title": "BAKERY_SOURCE_v02.md",
        "filename": "BAKERY_SOURCE_v02.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 12471,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_56ef6c058ff0526cab71042b281bb9a3",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03"
        ],
        "kind": "resource",
        "title": "MY_WORK_SOURCE_v01_FILLED_EXAMPLE.md",
        "filename": "MY_WORK_SOURCE_v01_FILLED_EXAMPLE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 5173,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_9bcf01110a295b2ba81410129027aaaf",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03",
          "ADV01"
        ],
        "kind": "resource",
        "title": "PICKUPS_V05_FILES.zip",
        "filename": "PICKUPS_V05_FILES.zip",
        "contentType": "application/zip",
        "bytes": 4467,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_650b8f56985451168f754de667e3f6a3",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP03",
          "ADV01"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP03_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 17279,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f583a23cc41f5c6482a68c173dc23605",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04"
        ],
        "kind": "resource",
        "title": "CUSTOMER_REQUEST.md",
        "filename": "CUSTOMER_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 585,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_8b77fee94d8351ed816d342d0711c1c6",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04"
        ],
        "kind": "resource",
        "title": "DRAFT_WITH_ERRORS.md",
        "filename": "DRAFT_WITH_ERRORS.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 939,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_ace6c04b2ad0595cb8b8d5dee581609e",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04"
        ],
        "kind": "resource",
        "title": "REVIEWED_REPLY.md",
        "filename": "REVIEWED_REPLY.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1355,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_2201dd92e0ad59be81189891fb16c05b",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04"
        ],
        "kind": "resource",
        "title": "REVIEW_MAP.md",
        "filename": "REVIEW_MAP.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2705,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d2c73c3f52ce5af3a21e3ca03b680847",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04"
        ],
        "kind": "resource",
        "title": "SOURCE_FOR_REVIEW.md",
        "filename": "SOURCE_FOR_REVIEW.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 12471,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e7589d388d845de49b01a49b67edbc94",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04",
          "ADV02"
        ],
        "kind": "resource",
        "title": "EP04_EXAMPLE_FILES.zip",
        "filename": "EP04_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5449,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_7a96149c11b25372b9868bbbab94103a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP04",
          "ADV02"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP04_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 6008,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f11cb03a201b5330950be805e4a6a7ee",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05"
        ],
        "kind": "resource",
        "title": "FEEDBACK_REQUEST.md",
        "filename": "FEEDBACK_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1779,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f1b4676b224851309fc808f6e42015f6",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05"
        ],
        "kind": "resource",
        "title": "REPLY_REVISED.md",
        "filename": "REPLY_REVISED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1051,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_feb3847470ea5350af13e3363a405cce",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05"
        ],
        "kind": "resource",
        "title": "SOURCE_AFTER_v03.md",
        "filename": "SOURCE_AFTER_v03.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 14550,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_45cac7ddb01a5e2aa45a5d3bfd367843",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05"
        ],
        "kind": "resource",
        "title": "SOURCE_BEFORE_v02.md",
        "filename": "SOURCE_BEFORE_v02.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 12471,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d50cc6f133bf5f6ab53a811b7af537ec",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05"
        ],
        "kind": "resource",
        "title": "WHAT_GOES_BACK_IN_SOURCE.md",
        "filename": "WHAT_GOES_BACK_IN_SOURCE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2433,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_8bbab8af4dc65b1eac612976a6699e48",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05",
          "ADV02"
        ],
        "kind": "resource",
        "title": "EP05_EXAMPLE_FILES.zip",
        "filename": "EP05_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 8434,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_8c498dd8f0935b5fb59f0eeb6f195ad6",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP05",
          "ADV02"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP05_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 9499,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_37da4cd8c50b5051b744fc3878dadeb4",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06"
        ],
        "kind": "resource",
        "title": "BAKERY_SOURCE_v03.md",
        "filename": "BAKERY_SOURCE_v03.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 14550,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_4c3742331e5f5f9aa47213decb418491",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06"
        ],
        "kind": "resource",
        "title": "READY_TO_USE_REQUEST.md",
        "filename": "READY_TO_USE_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1498,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_9cf54b984b4c5e988df65373891c225d",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06"
        ],
        "kind": "resource",
        "title": "SOURCE_VS_BRIEF.md",
        "filename": "SOURCE_VS_BRIEF.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1799,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_012f5b935ad4541a9d834ba7f0d7ed5f",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06"
        ],
        "kind": "resource",
        "title": "TASK_BRIEF_FILLED.md",
        "filename": "TASK_BRIEF_FILLED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2269,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_01816c17cdf15c16bd5e14df03d84d1f",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06"
        ],
        "kind": "resource",
        "title": "TASK_BRIEF_TEMPLATE.md",
        "filename": "TASK_BRIEF_TEMPLATE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1546,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_7bb34f5568ef595283bbc1b441d63791",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06",
          "ADV03"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e583232ab0965130bb1f9a2d5118e459",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06",
          "ADV03"
        ],
        "kind": "resource",
        "title": "OFFICE_TASK_BRIEF.md",
        "filename": "OFFICE_TASK_BRIEF.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1517,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_50a3d51dcf045ad098c0aa14b0fb7e3a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06"
        ],
        "kind": "resource",
        "title": "PICKUPS_V05_FILES.zip",
        "filename": "PICKUPS_V05_FILES.zip",
        "contentType": "application/zip",
        "bytes": 2115,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_9b871f12a06a5733bb8e348f4fc98f7b",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP06",
          "ADV03"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP06_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 11495,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_1d564ae801d152b1bc31d051ec1aaa24",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "BAD_DRAFT_FOR_COMPARISON.md",
        "filename": "BAD_DRAFT_FOR_COMPARISON.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1688,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_76d9ee85a7a1579f97dca21d06bf1acd",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_996a8b90a56a5c22b6f8a66ceebeedd0",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "OFFICE_TASK_BRIEF.md",
        "filename": "OFFICE_TASK_BRIEF.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1517,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_71116ced10ae596c90680c1460c39b17",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "REVIEWED_TEAM_UPDATE_v1.md",
        "filename": "REVIEWED_TEAM_UPDATE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1250,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_5168df68c2455dada9bb2a47bf8939f9",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "WALKTHROUGH_AND_CHECK.md",
        "filename": "WALKTHROUGH_AND_CHECK.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3958,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_3496a8bc13155e76bc366bdd53dd2581",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "01_CHECK_ATTACHED_SOURCE_REQUEST.md",
        "filename": "01_CHECK_ATTACHED_SOURCE_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1490,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e7b1afcaf686580bb169f1328f1022ae",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "02_PASTE_SOURCE_AND_BRIEF_READY.md",
        "filename": "02_PASTE_SOURCE_AND_BRIEF_READY.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 7056,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e1fb6409bce35c468cf5e2920629ff5c",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "03_UNKNOWN_REFERENCE_PREPARED.md",
        "filename": "03_UNKNOWN_REFERENCE_PREPARED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1762,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b4e10c3bee435752b9dae3c8a18d64dc",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "04_DRAFT_AFTER_CHECK_REQUEST.md",
        "filename": "04_DRAFT_AFTER_CHECK_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1408,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_925f12ef69a1542c91497da88104a61a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "05_REPAIR_PREPARED_DRAFT_REQUEST.md",
        "filename": "05_REPAIR_PREPARED_DRAFT_REQUEST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2551,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_3415a41c82c35222b3c0af4412f9971c",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "BAD_DRAFT_FOR_COMPARISON.md",
        "filename": "BAD_DRAFT_FOR_COMPARISON.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1688,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d575aa38e75e53eb83cef1b3305ed0d7",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_87c77283cace53ce995a707c13b865b1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "OFFICE_TASK_BRIEF.md",
        "filename": "OFFICE_TASK_BRIEF.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1517,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_28bb4486c07251d2b78921a776f21fae",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07",
          "ADV03"
        ],
        "kind": "resource",
        "title": "PICKUPS_V05_FILES.zip",
        "filename": "PICKUPS_V05_FILES.zip",
        "contentType": "application/zip",
        "bytes": 10058,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_dece1d571d7d59dd9f388cd532061d27",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "REVIEWED_TEAM_UPDATE_v1.md",
        "filename": "REVIEWED_TEAM_UPDATE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1250,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_dcf77f6a72e75aa0bf5695c58e0a43a3",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07"
        ],
        "kind": "resource",
        "title": "WALKTHROUGH_AND_CHECK.md",
        "filename": "WALKTHROUGH_AND_CHECK.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3958,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_4b17779432ff5d9097edef064fe264ef",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP07",
          "ADV03"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP07_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 25857,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_5b65fc69df5c5cad836fc4021f210dbc",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08"
        ],
        "kind": "resource",
        "title": "01_TEAM_UPDATE_v1.md",
        "filename": "01_TEAM_UPDATE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1218,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_c0351c59638b5c9cac4b83f667933105",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08"
        ],
        "kind": "resource",
        "title": "02_TEAM_EMAIL_v1.md",
        "filename": "02_TEAM_EMAIL_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1363,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_98dd66e75d5d50079da2f595b9c5c23f",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08"
        ],
        "kind": "resource",
        "title": "03_ACTIONS_v1.csv",
        "filename": "03_ACTIONS_v1.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1057,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_6615af06201252c09b8bcd45ed97d2ad",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_eaf477b05e5552e4960e9aafbb02113b",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08"
        ],
        "kind": "resource",
        "title": "THREE_FORMAT_BRIEFS.md",
        "filename": "THREE_FORMAT_BRIEFS.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2744,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d966c41b80fd5a9bb08daf86bfa11dba",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08"
        ],
        "kind": "resource",
        "title": "WHY_THE_FORMATS_DIFFER.md",
        "filename": "WHY_THE_FORMATS_DIFFER.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2120,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_c12c857583715841a37382b9668cffbd",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08",
          "ADV04"
        ],
        "kind": "resource",
        "title": "EP08_EXAMPLE_FILES.zip",
        "filename": "EP08_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 4937,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_6ce81fbb321a5d78ae0cd2a2c364c6c2",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP08",
          "ADV04"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP08_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5346,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_503140cd11605111bb7ccad76c820d99",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "01_TEAM_UPDATE_CHECKED.md",
        "filename": "01_TEAM_UPDATE_CHECKED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1179,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_4ba84bf4376356fa9e357dd5ab914fc2",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "02_EMAIL_DRIFTED.md",
        "filename": "02_EMAIL_DRIFTED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 755,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_5f95692cc8bc5df9bea120fbe18a4f9c",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "03_TEAM_EMAIL_FIXED.md",
        "filename": "03_TEAM_EMAIL_FIXED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1305,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_2dcd1b45430155cc9209830644253086",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "04_ACTIONS_CHECKED.csv",
        "filename": "04_ACTIONS_CHECKED.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1057,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_10e0c7ec844f5d1fa6f96a468f8a00f5",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "CONSISTENCY_METHOD.md",
        "filename": "CONSISTENCY_METHOD.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2623,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_bf68e45970005538a70eb0d1261e2ddc",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "CROSS_FORMAT_FACT_MATRIX.csv",
        "filename": "CROSS_FORMAT_FACT_MATRIX.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1966,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_eb0ecaa93c0957e7b71bcdddbcf5e81e",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_2f2cd6b177b75041b3dff9d811978486",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09",
          "ADV04"
        ],
        "kind": "resource",
        "title": "EP09_EXAMPLE_FILES.zip",
        "filename": "EP09_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5297,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_dca2c6745b13559791740646ce139014",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP09",
          "ADV04"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP09_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5674,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_370252db3b6059c3ba6162129018bc7c",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_c81c2f4f0d505adca3e6dafc220651b5",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10"
        ],
        "kind": "resource",
        "title": "RECIPE_CUSTOMER_REPLY.md",
        "filename": "RECIPE_CUSTOMER_REPLY.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1892,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b2528d24fee55ef291d75de36b6d8ff9",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10"
        ],
        "kind": "resource",
        "title": "RECIPE_INDEX.csv",
        "filename": "RECIPE_INDEX.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 832,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b1a55e3cb60b55b693861eca6e4c1865",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10"
        ],
        "kind": "resource",
        "title": "RECIPE_TEAM_UPDATE.md",
        "filename": "RECIPE_TEAM_UPDATE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2467,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d7ffd48ad228595a96539fc5032b4c1e",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10"
        ],
        "kind": "resource",
        "title": "RECIPE_TEMPLATE.md",
        "filename": "RECIPE_TEMPLATE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1307,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_95b83851c003567c81c3ea2e31242228",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10"
        ],
        "kind": "resource",
        "title": "TWO_RUNS_SAME_RECIPE.md",
        "filename": "TWO_RUNS_SAME_RECIPE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3213,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_33d4b28d8f1457aeb91a621b04051721",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10",
          "ADV05"
        ],
        "kind": "resource",
        "title": "EP10_EXAMPLE_FILES.zip",
        "filename": "EP10_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5325,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e48ddd852e525377b0a1de2b37bfc68a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP10",
          "ADV05"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP10_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5726,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f97878145c545ce5a8798a13342720ed",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "CHANGELOG_v1_to_v2.md",
        "filename": "CHANGELOG_v1_to_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1946,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_abaa85aad6a05fb9af934d0a6d2d77f6",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "NEW_INFORMATION.md",
        "filename": "NEW_INFORMATION.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 850,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_6c0ab6c6059d5bf2a7eb42dd85c00a18",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v1.md",
        "filename": "OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_9c6c1807560d545db7217b6fc6acd747",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v2.md",
        "filename": "OFFICE_SOURCE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4955,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_58a47a97291250ea96a9606fb45904e6",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "TEAM_UPDATE_v1.md",
        "filename": "TEAM_UPDATE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1178,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_6daaf07cdd395d579928cc7d8606b615",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "TEAM_UPDATE_v2.md",
        "filename": "TEAM_UPDATE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1145,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_da2156d5346d53b0b335944c90858cd1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11"
        ],
        "kind": "resource",
        "title": "UPDATE_RECIPE.md",
        "filename": "UPDATE_RECIPE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2503,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_17db456c9f1d589fbc659bac5c12ce30",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11",
          "ADV05"
        ],
        "kind": "resource",
        "title": "EP11_EXAMPLE_FILES.zip",
        "filename": "EP11_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 6258,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_fdd75fb6d8ca50749a897cf7939a3650",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP11",
          "ADV05"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP11_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 6744,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_dd371a24e2d159bc87d22572b787cd98",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "ACTIONS_v2.csv",
        "filename": "ACTIONS_v2.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1172,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_d85aa55156ca53b189c36dff038fc625",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "HTML_BRIEF.md",
        "filename": "HTML_BRIEF.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2630,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_8c58b9f2e4e05460981941f6d3db252b",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "OFFICE_SOURCE_v2.md",
        "filename": "OFFICE_SOURCE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4955,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_45b157b810fe56f9a3340e6b26bb3587",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "README_OPEN_FIRST.md",
        "filename": "README_OPEN_FIRST.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2989,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_a8013a78afd35441aecf190b5d00913c",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "TEAM_EMAIL_v2.md",
        "filename": "TEAM_EMAIL_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1227,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_617b455cbdb55811b038f135aea3e9d3",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "TEAM_UPDATE_v2.md",
        "filename": "TEAM_UPDATE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1145,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_853bfcfe6abb5601ae6fd7d054b65f64",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12"
        ],
        "kind": "resource",
        "title": "WORK_SUMMARY.html",
        "filename": "WORK_SUMMARY.html",
        "contentType": "text/html; charset=utf-8",
        "bytes": 8548,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_c940fdc13c4a50199be669a725287622",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12",
          "CH06"
        ],
        "kind": "resource",
        "title": "EP12_WORK_BUNDLE.zip",
        "filename": "EP12_WORK_BUNDLE.zip",
        "contentType": "application/zip",
        "bytes": 8462,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_1798c59f96f55872bd21f17a6cd73328",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP12",
          "CH06"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP12_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 17350,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_1b8d6f7d0386514a86d99312efd7f858",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "01_OFFICE_SOURCE_v1.md",
        "filename": "01_OFFICE_SOURCE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4181,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_6a51064583d15ec19381c2e2d8c45119",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "02_BAD_DRAFT_AND_REVIEW.md",
        "filename": "02_BAD_DRAFT_AND_REVIEW.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1736,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_95e7212c6520585c960efbe993f274fa",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "03_TEAM_UPDATE_v1.md",
        "filename": "03_TEAM_UPDATE_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1178,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_1f0a7a9bdb6a5c03830f4308ad6df9bd",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "04_TEAM_EMAIL_v1.md",
        "filename": "04_TEAM_EMAIL_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1329,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_2f039e0cfa2a599c94ba375225595fc3",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "05_ACTIONS_v1.csv",
        "filename": "05_ACTIONS_v1.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1057,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e81bfe1f11ed5952bbf305086e25141f",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "06_NEW_INFORMATION.md",
        "filename": "06_NEW_INFORMATION.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 632,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f93017030c955a2ebd1cf6ee8380ca7f",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "07_OFFICE_SOURCE_v2.md",
        "filename": "07_OFFICE_SOURCE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4955,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_c7830802fe9d57a2b74996c954372273",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "08_TEAM_UPDATE_v2.md",
        "filename": "08_TEAM_UPDATE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1145,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_61d04c77e2a6514c9e16eea5171e2eb4",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "09_TEAM_EMAIL_v2.md",
        "filename": "09_TEAM_EMAIL_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1227,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_efc598b5181259f7a6bafd8fd8aaeb3a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "10_ACTIONS_v2.csv",
        "filename": "10_ACTIONS_v2.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1172,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_bc52409ca9265df689a74c87dbeb8764",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "11_WORK_SUMMARY.html",
        "filename": "11_WORK_SUMMARY.html",
        "contentType": "text/html; charset=utf-8",
        "bytes": 8560,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_19d7ad2db9615908a8f0ce8a8aaf1026",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "12_RUN_THE_CASE.md",
        "filename": "12_RUN_THE_CASE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 5104,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_3ff09c90969a54ab875fe46c7aca71bd",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "13_REUSABLE_OFFICE_RECIPE.md",
        "filename": "13_REUSABLE_OFFICE_RECIPE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2236,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_59f3dfa29c475aca82eb823b628bf907",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "04_TEAM_EMAIL_v1.md",
        "filename": "04_TEAM_EMAIL_v1.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1329,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_65ea1c33fc5a5c36a6d63871fd318e37",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "06_NEW_INFORMATION.md",
        "filename": "06_NEW_INFORMATION.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 632,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b4c827c71a6353a2aff307e08faa17f1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "07_OFFICE_SOURCE_v2.md",
        "filename": "07_OFFICE_SOURCE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4955,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_403026204c5a52c692486ea893322305",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "08_TEAM_UPDATE_v2.md",
        "filename": "08_TEAM_UPDATE_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1145,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_1252e7e0554e50b091436244fb2f8640",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "09_TEAM_EMAIL_v2.md",
        "filename": "09_TEAM_EMAIL_v2.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1227,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_cb21bc16beab5a6c88e6fbbf25f2c3a1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "10_ACTIONS_v2.csv",
        "filename": "10_ACTIONS_v2.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 1172,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_af1a0f06bc4550ba9800e0cb5b0ce1d1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "EMAIL_QUESTION_CHANGE_PREPARED.md",
        "filename": "EMAIL_QUESTION_CHANGE_PREPARED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2279,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_5f7f6e01b3845e4686628e73d15357a1",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "PICKUPS_V05_FILES.zip",
        "filename": "PICKUPS_V05_FILES.zip",
        "contentType": "application/zip",
        "bytes": 5230,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_cc85e967c4355ba5810e83b1196e3bb7",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP13"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP13_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 24976,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_43d25d65ac7e5d2abbae047945c4f7bb",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "01_BAKERY_SOURCE_v03.md",
        "filename": "01_BAKERY_SOURCE_v03.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 14550,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f319fd8fe0dd51b5b02a8222db8a5d6b",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "02_BAD_POST_AND_REVIEW.md",
        "filename": "02_BAD_POST_AND_REVIEW.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1786,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_9e18a83cb79757bd92e3e9b811e2d590",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "03_POST_REVIEWED.md",
        "filename": "03_POST_REVIEWED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1108,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_027f308571635ace8116ea3dd5a30008",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "04_CUSTOMER_REPLY_REVIEWED.md",
        "filename": "04_CUSTOMER_REPLY_REVIEWED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1652,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b68eab597f325382af724d4b8173f388",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "05_PROPOSAL_INTERNAL.md",
        "filename": "05_PROPOSAL_INTERNAL.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3519,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_86f59ec57c41506bb2ac96a7a0641189",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "06_QUESTIONS_TO_CONFIRM.md",
        "filename": "06_QUESTIONS_TO_CONFIRM.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2099,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_f8ae4a0ca419551a94ad803ff011b0f4",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "07_SIX_STEP_WALKTHROUGH.md",
        "filename": "07_SIX_STEP_WALKTHROUGH.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 4806,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b67f840a111a54bcaf633aef1875dd28",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "08_PRICE_CHECK.csv",
        "filename": "08_PRICE_CHECK.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 978,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_0af7db4b63c05222a33205218f4d06fb",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "09_BUSINESS_SUMMARY.html",
        "filename": "09_BUSINESS_SUMMARY.html",
        "contentType": "text/html; charset=utf-8",
        "bytes": 5852,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_97633a9093dd5df986a3edbe0186654a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "10_BUSINESS_RECIPE.md",
        "filename": "10_BUSINESS_RECIPE.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2164,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_b465b68f73575a78b4e122b88e5ea2f4",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "01_BAKERY_SOURCE_v03.md",
        "filename": "01_BAKERY_SOURCE_v03.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 14550,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_9ec0efc9b1dd5bf7b9a20c24ebb3b47b",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "03_POST_REVIEWED.md",
        "filename": "03_POST_REVIEWED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1108,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_661b7d68392d5723b9ef3d79b11cc448",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "04_CUSTOMER_REPLY_REVIEWED.md",
        "filename": "04_CUSTOMER_REPLY_REVIEWED.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 1652,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_a8c5639c7312567ca6eeeee258e84762",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "05_PROPOSAL_INTERNAL.md",
        "filename": "05_PROPOSAL_INTERNAL.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3519,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_284b3e1fe5555e618cf492b2beadd820",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "06_QUESTIONS_TO_CONFIRM.md",
        "filename": "06_QUESTIONS_TO_CONFIRM.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 2099,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_12e6a4ac38ad515f84a5e8c900882203",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "08_PRICE_CHECK.csv",
        "filename": "08_PRICE_CHECK.csv",
        "contentType": "text/csv; charset=utf-8",
        "bytes": 978,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_4cbc093b7202585d8e9c6d3758520a6d",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "PICKUPS_V05_FILES.zip",
        "filename": "PICKUPS_V05_FILES.zip",
        "contentType": "application/zip",
        "bytes": 8200,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_80102a02bbe35ebd9f9641c01ef42599",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "THREE_FORMAT_REQUESTS_READY.md",
        "filename": "THREE_FORMAT_REQUESTS_READY.md",
        "contentType": "text/markdown; charset=utf-8",
        "bytes": 3094,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_e492599ae582584593eea3e47175d04a",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "EP14_EXAMPLE_FILES.zip",
        "filename": "EP14_EXAMPLE_FILES.zip",
        "contentType": "application/zip",
        "bytes": 12613,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_6b717836c3bf50bd852ea03d5c2d24bb",
        "courseId": "ai-sauce",
        "lessonIds": [
          "EP14"
        ],
        "kind": "resource",
        "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
        "filename": "EP14_LEARNER_FILES.zip",
        "contentType": "application/zip",
        "bytes": 30994,
        "disposition": "attachment",
        "previewAllowed": false
      },
      {
        "id": "m_ef3ab2740be95924882cd2faadbd7cf7",
        "courseId": "ai-sauce",
        "lessonIds": [
          "ADV01"
        ],
        "kind": "resource",
        "title": "เครื่องมือจัด Source แบบพกไปใช้",
        "filename": "SOURCE_WORKBENCH.zip",
        "contentType": "application/zip",
        "bytes": 5688,
        "disposition": "attachment",
        "previewAllowed": false
      }
    ],
    "trialUrl": "/classroom/",
    "bonus": {
      "id": "ai-sauce-companion-v1",
      "title": "คู่มือ AI ใส่ซอส + AI ผู้ช่วยงาน",
      "description": "คู่มือพร้อมภาพประกอบ 36 หน้า มูลค่า 500 บาท + ผู้ช่วยงาน .md มูลค่า 1,190 บาท ให้ AI ถาม เก็บซอส ทำร่าง ชิมและปรับตามโครงสร้างคอร์ส แล้วเก็บซอส ชิ้นงาน และสูตรไว้ใช้ต่อ",
      "valueTHB": 1690,
      "lessonId": "FOUNDATION",
      "resourceIds": [
        "m_239d031ddb6bd86394fe85595fd6c78c",
        "m_1d54eb10f819fecc15b9bb13c68f3299"
      ]
    }
  }
];

export const LEARN_ASSETS = [
  {
    "id": "m_6d24ea3d11d85502b855151525f0c175",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "video",
    "title": "FOUNDATION_AI_SAUCE_v06.mp4",
    "filename": "FOUNDATION_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 11623194,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_85b6093412e2560d8647c996e1fe1c97",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "captions",
    "title": "FOUNDATION_AI_SAUCE_v06.srt",
    "filename": "FOUNDATION_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 9907,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1a0c67647bfe55478316a77cd0266b6f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV01"
    ],
    "kind": "video",
    "title": "ADV01_AI_SAUCE_v06.mp4",
    "filename": "ADV01_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 13252934,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_b4109cb188f5593da04023f53fe9cc68",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV01"
    ],
    "kind": "captions",
    "title": "ADV01_AI_SAUCE_v06.srt",
    "filename": "ADV01_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 8375,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5298f649c5d259c796386eacdcbfcd5d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV02"
    ],
    "kind": "video",
    "title": "ADV02_AI_SAUCE_v06.mp4",
    "filename": "ADV02_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 17048135,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_741abadfc9df56958f04ac58ab30b509",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV02"
    ],
    "kind": "captions",
    "title": "ADV02_AI_SAUCE_v06.srt",
    "filename": "ADV02_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 9632,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_18cf233240e3509bb836f9354c1bf87f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV03"
    ],
    "kind": "video",
    "title": "ADV03_AI_SAUCE_v06.mp4",
    "filename": "ADV03_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 14675758,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_fcbe6af0d5a45bf98144caed8fbc66f5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV03"
    ],
    "kind": "captions",
    "title": "ADV03_AI_SAUCE_v06.srt",
    "filename": "ADV03_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 8288,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f2676fb75a0b5537a07abc56aff888d1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV04"
    ],
    "kind": "video",
    "title": "ADV04_AI_SAUCE_v06.mp4",
    "filename": "ADV04_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 10841609,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_f6bd8f20ea575905b5da1c882f1b44cf",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV04"
    ],
    "kind": "captions",
    "title": "ADV04_AI_SAUCE_v06.srt",
    "filename": "ADV04_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 7377,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b4f23044812557249a063561c7d5e3b0",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV05"
    ],
    "kind": "video",
    "title": "ADV05_AI_SAUCE_v06.mp4",
    "filename": "ADV05_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 12666313,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_3bc9702adba2515388ffb96e583d3fe9",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV05"
    ],
    "kind": "captions",
    "title": "ADV05_AI_SAUCE_v06.srt",
    "filename": "ADV05_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 9794,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_4d1d2565e8da5c0d8dcfb0bb37f286e2",
    "courseId": "ai-sauce",
    "lessonIds": [
      "CH06"
    ],
    "kind": "video",
    "title": "CH06_WEB_AND_DUNGEON_v06.mp4",
    "filename": "CH06_WEB_AND_DUNGEON_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 46322875,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_c5bc7c9bdc365fb2b1ab0b0673a5a8f4",
    "courseId": "ai-sauce",
    "lessonIds": [
      "CH06"
    ],
    "kind": "captions",
    "title": "CH06_WEB_AND_DUNGEON_v06.srt",
    "filename": "CH06_WEB_AND_DUNGEON_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 33370,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6f23358d22f45d64b324689cdb9ceb16",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01"
    ],
    "kind": "video",
    "title": "S1_1_SOURCE_CODEX_v05.mp4",
    "filename": "S1_1_SOURCE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 6676836,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_5feebf399798571ea5798521fd8e649e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01"
    ],
    "kind": "captions",
    "title": "S1_1_SOURCE_CODEX_v05.srt",
    "filename": "S1_1_SOURCE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 3644,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_bd8f96e3ed5d5831a9a993fb5c598000",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01",
      "FOUNDATION"
    ],
    "kind": "resource",
    "title": "MY_WORK_SOURCE_TEMPLATE.md",
    "filename": "MY_WORK_SOURCE_TEMPLATE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1848,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_556f437dd27c5560bc613e9d18903d5a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01",
      "FOUNDATION"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP01_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 888,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_45a9e0e2e7b15de5bbc9faf1202814d6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "video",
    "title": "EP02_CAPTURE_CODEX_v05.mp4",
    "filename": "EP02_CAPTURE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 8746968,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_91d2f7e9b7295dd1b09b72cc3357c885",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "captions",
    "title": "EP02_CAPTURE_CODEX_v05.srt",
    "filename": "EP02_CAPTURE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 4113,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_99ede3d3957454ac94f1739fcdfa5d44",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "01_VOICE_NOTE_SAMPLE.md",
    "filename": "01_VOICE_NOTE_SAMPLE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1178,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_df566f944ab558d69391e9e12fa413b5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "02_MENU_SAMPLE.csv",
    "filename": "02_MENU_SAMPLE.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 281,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_a3c56ed2968754a7a0c58177129c281d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "03_CUSTOMER_CHAT_SAMPLE.md",
    "filename": "03_CUSTOMER_CHAT_SAMPLE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1322,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_cca4e1bba07252549a4f30a122d1c9d4",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "04_EXTRACT_REQUEST.md",
    "filename": "04_EXTRACT_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1789,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_db181e10acbf58d88569bf080f9f4d33",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "05_SOURCE_SAMPLE_v01.md",
    "filename": "05_SOURCE_SAMPLE_v01.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3648,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_56759fc8a0565fa59af8c9c7423f0dc1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02",
      "ADV01"
    ],
    "kind": "resource",
    "title": "EP02_EXAMPLE_FILES.zip",
    "filename": "EP02_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 3469,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_038c6592d9fc51b2b9b00d19f35c4614",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02",
      "ADV01"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP02_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 3715,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_aae7b49b41185959b62af20910581624",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "video",
    "title": "EP03_SOURCE_CODEX_v05.mp4",
    "filename": "EP03_SOURCE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 5894218,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_049ad1c543655221a912659934072e6d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "captions",
    "title": "EP03_SOURCE_CODEX_v05.srt",
    "filename": "EP03_SOURCE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 3386,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d6c2a2dcb29f58319c10d7203242a2c0",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "BAKERY_SOURCE_v01.md",
    "filename": "BAKERY_SOURCE_v01.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3847,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5e9b4446fced5968be361ef105481b3e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "BAKERY_SOURCE_v02.md",
    "filename": "BAKERY_SOURCE_v02.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 12471,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5ffc0acee1725f30a61003198c63a979",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "CHANGELOG_v01_to_v02.md",
    "filename": "CHANGELOG_v01_to_v02.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2255,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_22693386832f5820937a49a4df9385a5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03",
      "ADV01"
    ],
    "kind": "resource",
    "title": "MY_WORK_SOURCE_TEMPLATE.md",
    "filename": "MY_WORK_SOURCE_TEMPLATE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1848,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c1b9c7a27d61543e8e8a080650ad0a0f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "OPEN_EDIT_USE.md",
    "filename": "OPEN_EDIT_USE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2906,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_41aeb9ff11705c7a9c107f724cd2f292",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "BAKERY_SOURCE_v02.md",
    "filename": "BAKERY_SOURCE_v02.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 12471,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_56ef6c058ff0526cab71042b281bb9a3",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "MY_WORK_SOURCE_v01_FILLED_EXAMPLE.md",
    "filename": "MY_WORK_SOURCE_v01_FILLED_EXAMPLE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 5173,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9bcf01110a295b2ba81410129027aaaf",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03",
      "ADV01"
    ],
    "kind": "resource",
    "title": "PICKUPS_V05_FILES.zip",
    "filename": "PICKUPS_V05_FILES.zip",
    "contentType": "application/zip",
    "bytes": 4467,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_650b8f56985451168f754de667e3f6a3",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03",
      "ADV01"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP03_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 17279,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1df832c402ba5a668eb3cadeffc7372a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "video",
    "title": "EP04_TASTE_CODEX_v05.mp4",
    "filename": "EP04_TASTE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 3591883,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_95fb7821183a5622acb00c9fef066df6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "captions",
    "title": "EP04_TASTE_CODEX_v05.srt",
    "filename": "EP04_TASTE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 2294,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f583a23cc41f5c6482a68c173dc23605",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "CUSTOMER_REQUEST.md",
    "filename": "CUSTOMER_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 585,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_8b77fee94d8351ed816d342d0711c1c6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "DRAFT_WITH_ERRORS.md",
    "filename": "DRAFT_WITH_ERRORS.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 939,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_ace6c04b2ad0595cb8b8d5dee581609e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "REVIEWED_REPLY.md",
    "filename": "REVIEWED_REPLY.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1355,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_2201dd92e0ad59be81189891fb16c05b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "REVIEW_MAP.md",
    "filename": "REVIEW_MAP.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2705,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d2c73c3f52ce5af3a21e3ca03b680847",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "SOURCE_FOR_REVIEW.md",
    "filename": "SOURCE_FOR_REVIEW.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 12471,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e7589d388d845de49b01a49b67edbc94",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04",
      "ADV02"
    ],
    "kind": "resource",
    "title": "EP04_EXAMPLE_FILES.zip",
    "filename": "EP04_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5449,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_7a96149c11b25372b9868bbbab94103a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04",
      "ADV02"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP04_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 6008,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d430024f912854ceb082b6d86e01966e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "video",
    "title": "EP05_REPAIR_CODEX_v05.mp4",
    "filename": "EP05_REPAIR_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 4980521,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_038038163ea1579dafb6b595f44efb7d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "captions",
    "title": "EP05_REPAIR_CODEX_v05.srt",
    "filename": "EP05_REPAIR_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 2107,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f11cb03a201b5330950be805e4a6a7ee",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "resource",
    "title": "FEEDBACK_REQUEST.md",
    "filename": "FEEDBACK_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1779,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f1b4676b224851309fc808f6e42015f6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "resource",
    "title": "REPLY_REVISED.md",
    "filename": "REPLY_REVISED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1051,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_feb3847470ea5350af13e3363a405cce",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "resource",
    "title": "SOURCE_AFTER_v03.md",
    "filename": "SOURCE_AFTER_v03.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 14550,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_45cac7ddb01a5e2aa45a5d3bfd367843",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "resource",
    "title": "SOURCE_BEFORE_v02.md",
    "filename": "SOURCE_BEFORE_v02.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 12471,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d50cc6f133bf5f6ab53a811b7af537ec",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "resource",
    "title": "WHAT_GOES_BACK_IN_SOURCE.md",
    "filename": "WHAT_GOES_BACK_IN_SOURCE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2433,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_8bbab8af4dc65b1eac612976a6699e48",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05",
      "ADV02"
    ],
    "kind": "resource",
    "title": "EP05_EXAMPLE_FILES.zip",
    "filename": "EP05_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 8434,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_8c498dd8f0935b5fb59f0eeb6f195ad6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05",
      "ADV02"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP05_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 9499,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1c2903b92031593cb98ffe5db2a1d538",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "video",
    "title": "EP06_BRIEF_CODEX_v05.mp4",
    "filename": "EP06_BRIEF_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 5063258,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_54cd912ce52455a7ba1df0e0d5a86424",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "captions",
    "title": "EP06_BRIEF_CODEX_v05.srt",
    "filename": "EP06_BRIEF_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 2831,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_37da4cd8c50b5051b744fc3878dadeb4",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "BAKERY_SOURCE_v03.md",
    "filename": "BAKERY_SOURCE_v03.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 14550,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_4c3742331e5f5f9aa47213decb418491",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "READY_TO_USE_REQUEST.md",
    "filename": "READY_TO_USE_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1498,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9cf54b984b4c5e988df65373891c225d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "SOURCE_VS_BRIEF.md",
    "filename": "SOURCE_VS_BRIEF.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1799,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_012f5b935ad4541a9d834ba7f0d7ed5f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "TASK_BRIEF_FILLED.md",
    "filename": "TASK_BRIEF_FILLED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2269,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_01816c17cdf15c16bd5e14df03d84d1f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "TASK_BRIEF_TEMPLATE.md",
    "filename": "TASK_BRIEF_TEMPLATE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1546,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_7bb34f5568ef595283bbc1b441d63791",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06",
      "ADV03"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e583232ab0965130bb1f9a2d5118e459",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06",
      "ADV03"
    ],
    "kind": "resource",
    "title": "OFFICE_TASK_BRIEF.md",
    "filename": "OFFICE_TASK_BRIEF.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1517,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_50a3d51dcf045ad098c0aa14b0fb7e3a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "PICKUPS_V05_FILES.zip",
    "filename": "PICKUPS_V05_FILES.zip",
    "contentType": "application/zip",
    "bytes": 2115,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9b871f12a06a5733bb8e348f4fc98f7b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06",
      "ADV03"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP06_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 11495,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_40e6d08596565db085403b903be838b0",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "video",
    "title": "EP07_COOK_CODEX_v05.mp4",
    "filename": "EP07_COOK_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 6173841,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_4080c6c04ee350929316166c3137277c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "captions",
    "title": "EP07_COOK_CODEX_v05.srt",
    "filename": "EP07_COOK_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 5184,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1d564ae801d152b1bc31d051ec1aaa24",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "BAD_DRAFT_FOR_COMPARISON.md",
    "filename": "BAD_DRAFT_FOR_COMPARISON.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1688,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_76d9ee85a7a1579f97dca21d06bf1acd",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_996a8b90a56a5c22b6f8a66ceebeedd0",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "OFFICE_TASK_BRIEF.md",
    "filename": "OFFICE_TASK_BRIEF.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1517,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_71116ced10ae596c90680c1460c39b17",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "REVIEWED_TEAM_UPDATE_v1.md",
    "filename": "REVIEWED_TEAM_UPDATE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1250,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5168df68c2455dada9bb2a47bf8939f9",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "WALKTHROUGH_AND_CHECK.md",
    "filename": "WALKTHROUGH_AND_CHECK.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3958,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_3496a8bc13155e76bc366bdd53dd2581",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "01_CHECK_ATTACHED_SOURCE_REQUEST.md",
    "filename": "01_CHECK_ATTACHED_SOURCE_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1490,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e7b1afcaf686580bb169f1328f1022ae",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "02_PASTE_SOURCE_AND_BRIEF_READY.md",
    "filename": "02_PASTE_SOURCE_AND_BRIEF_READY.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 7056,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e1fb6409bce35c468cf5e2920629ff5c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "03_UNKNOWN_REFERENCE_PREPARED.md",
    "filename": "03_UNKNOWN_REFERENCE_PREPARED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1762,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b4e10c3bee435752b9dae3c8a18d64dc",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "04_DRAFT_AFTER_CHECK_REQUEST.md",
    "filename": "04_DRAFT_AFTER_CHECK_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1408,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_925f12ef69a1542c91497da88104a61a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "05_REPAIR_PREPARED_DRAFT_REQUEST.md",
    "filename": "05_REPAIR_PREPARED_DRAFT_REQUEST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2551,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_3415a41c82c35222b3c0af4412f9971c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "BAD_DRAFT_FOR_COMPARISON.md",
    "filename": "BAD_DRAFT_FOR_COMPARISON.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1688,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d575aa38e75e53eb83cef1b3305ed0d7",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_87c77283cace53ce995a707c13b865b1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "OFFICE_TASK_BRIEF.md",
    "filename": "OFFICE_TASK_BRIEF.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1517,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_28bb4486c07251d2b78921a776f21fae",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07",
      "ADV03"
    ],
    "kind": "resource",
    "title": "PICKUPS_V05_FILES.zip",
    "filename": "PICKUPS_V05_FILES.zip",
    "contentType": "application/zip",
    "bytes": 10058,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dece1d571d7d59dd9f388cd532061d27",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "REVIEWED_TEAM_UPDATE_v1.md",
    "filename": "REVIEWED_TEAM_UPDATE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1250,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dcf77f6a72e75aa0bf5695c58e0a43a3",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "WALKTHROUGH_AND_CHECK.md",
    "filename": "WALKTHROUGH_AND_CHECK.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3958,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_4b17779432ff5d9097edef064fe264ef",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07",
      "ADV03"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP07_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 25857,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d94ca9bc345a5f79a8acbd8983b3fe60",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "video",
    "title": "EP08_SPLIT_CODEX_v05.mp4",
    "filename": "EP08_SPLIT_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 3571156,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_10a7e714694c5aed900041c49513acc3",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "captions",
    "title": "EP08_SPLIT_CODEX_v05.srt",
    "filename": "EP08_SPLIT_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 1865,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5b65fc69df5c5cad836fc4021f210dbc",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "01_TEAM_UPDATE_v1.md",
    "filename": "01_TEAM_UPDATE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1218,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c0351c59638b5c9cac4b83f667933105",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "02_TEAM_EMAIL_v1.md",
    "filename": "02_TEAM_EMAIL_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1363,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_98dd66e75d5d50079da2f595b9c5c23f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "03_ACTIONS_v1.csv",
    "filename": "03_ACTIONS_v1.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1057,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6615af06201252c09b8bcd45ed97d2ad",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_eaf477b05e5552e4960e9aafbb02113b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "THREE_FORMAT_BRIEFS.md",
    "filename": "THREE_FORMAT_BRIEFS.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2744,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d966c41b80fd5a9bb08daf86bfa11dba",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "WHY_THE_FORMATS_DIFFER.md",
    "filename": "WHY_THE_FORMATS_DIFFER.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2120,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c12c857583715841a37382b9668cffbd",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08",
      "ADV04"
    ],
    "kind": "resource",
    "title": "EP08_EXAMPLE_FILES.zip",
    "filename": "EP08_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 4937,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6ce81fbb321a5d78ae0cd2a2c364c6c2",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08",
      "ADV04"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP08_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5346,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_a47d672601445e54b13e1525a073f9ba",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "video",
    "title": "EP09_CONSISTENCY_CODEX_v05.mp4",
    "filename": "EP09_CONSISTENCY_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 1105357,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_9adff3b4aa135d238728d78000d763fa",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "captions",
    "title": "EP09_CONSISTENCY_CODEX_v05.srt",
    "filename": "EP09_CONSISTENCY_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 1210,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_503140cd11605111bb7ccad76c820d99",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "01_TEAM_UPDATE_CHECKED.md",
    "filename": "01_TEAM_UPDATE_CHECKED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1179,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_4ba84bf4376356fa9e357dd5ab914fc2",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "02_EMAIL_DRIFTED.md",
    "filename": "02_EMAIL_DRIFTED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 755,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5f95692cc8bc5df9bea120fbe18a4f9c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "03_TEAM_EMAIL_FIXED.md",
    "filename": "03_TEAM_EMAIL_FIXED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1305,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_2dcd1b45430155cc9209830644253086",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "04_ACTIONS_CHECKED.csv",
    "filename": "04_ACTIONS_CHECKED.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1057,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_10e0c7ec844f5d1fa6f96a468f8a00f5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "CONSISTENCY_METHOD.md",
    "filename": "CONSISTENCY_METHOD.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2623,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_bf68e45970005538a70eb0d1261e2ddc",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "CROSS_FORMAT_FACT_MATRIX.csv",
    "filename": "CROSS_FORMAT_FACT_MATRIX.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1966,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_eb0ecaa93c0957e7b71bcdddbcf5e81e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_2f2cd6b177b75041b3dff9d811978486",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09",
      "ADV04"
    ],
    "kind": "resource",
    "title": "EP09_EXAMPLE_FILES.zip",
    "filename": "EP09_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5297,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dca2c6745b13559791740646ce139014",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09",
      "ADV04"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP09_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5674,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_140f96deed005487a6a0a8f17b903e2f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "video",
    "title": "EP10_RECIPE_CODEX_v05.mp4",
    "filename": "EP10_RECIPE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 4656146,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_8282189af7ee51afa31fc8c07c278292",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "captions",
    "title": "EP10_RECIPE_CODEX_v05.srt",
    "filename": "EP10_RECIPE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 2123,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_370252db3b6059c3ba6162129018bc7c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c81c2f4f0d505adca3e6dafc220651b5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "RECIPE_CUSTOMER_REPLY.md",
    "filename": "RECIPE_CUSTOMER_REPLY.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1892,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b2528d24fee55ef291d75de36b6d8ff9",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "RECIPE_INDEX.csv",
    "filename": "RECIPE_INDEX.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 832,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b1a55e3cb60b55b693861eca6e4c1865",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "RECIPE_TEAM_UPDATE.md",
    "filename": "RECIPE_TEAM_UPDATE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2467,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d7ffd48ad228595a96539fc5032b4c1e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "RECIPE_TEMPLATE.md",
    "filename": "RECIPE_TEMPLATE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1307,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_95b83851c003567c81c3ea2e31242228",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "TWO_RUNS_SAME_RECIPE.md",
    "filename": "TWO_RUNS_SAME_RECIPE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3213,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_33d4b28d8f1457aeb91a621b04051721",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10",
      "ADV05"
    ],
    "kind": "resource",
    "title": "EP10_EXAMPLE_FILES.zip",
    "filename": "EP10_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5325,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e48ddd852e525377b0a1de2b37bfc68a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10",
      "ADV05"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP10_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5726,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_614f4629d6df5d01961067b872d219e0",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "video",
    "title": "EP11_UPDATE_CODEX_v05.mp4",
    "filename": "EP11_UPDATE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 6524118,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_5ebda43ee5055513a543eb78c590644c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "captions",
    "title": "EP11_UPDATE_CODEX_v05.srt",
    "filename": "EP11_UPDATE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 3121,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f97878145c545ce5a8798a13342720ed",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "CHANGELOG_v1_to_v2.md",
    "filename": "CHANGELOG_v1_to_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1946,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_abaa85aad6a05fb9af934d0a6d2d77f6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "NEW_INFORMATION.md",
    "filename": "NEW_INFORMATION.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 850,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6c0ab6c6059d5bf2a7eb42dd85c00a18",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v1.md",
    "filename": "OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9c6c1807560d545db7217b6fc6acd747",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v2.md",
    "filename": "OFFICE_SOURCE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4955,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_58a47a97291250ea96a9606fb45904e6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "TEAM_UPDATE_v1.md",
    "filename": "TEAM_UPDATE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1178,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6daaf07cdd395d579928cc7d8606b615",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "TEAM_UPDATE_v2.md",
    "filename": "TEAM_UPDATE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1145,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_da2156d5346d53b0b335944c90858cd1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "UPDATE_RECIPE.md",
    "filename": "UPDATE_RECIPE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2503,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_17db456c9f1d589fbc659bac5c12ce30",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11",
      "ADV05"
    ],
    "kind": "resource",
    "title": "EP11_EXAMPLE_FILES.zip",
    "filename": "EP11_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 6258,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_fdd75fb6d8ca50749a897cf7939a3650",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11",
      "ADV05"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP11_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 6744,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_574dee5df795586e9c0019aa509eacc6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "video",
    "title": "EP12_SERVE_CODEX_v05.mp4",
    "filename": "EP12_SERVE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 7388406,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_c51bd8995b635e508c4328efd5c6e085",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "captions",
    "title": "EP12_SERVE_CODEX_v05.srt",
    "filename": "EP12_SERVE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 4404,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dd371a24e2d159bc87d22572b787cd98",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "ACTIONS_v2.csv",
    "filename": "ACTIONS_v2.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1172,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d85aa55156ca53b189c36dff038fc625",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "HTML_BRIEF.md",
    "filename": "HTML_BRIEF.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2630,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_8c58b9f2e4e05460981941f6d3db252b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "OFFICE_SOURCE_v2.md",
    "filename": "OFFICE_SOURCE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4955,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_45b157b810fe56f9a3340e6b26bb3587",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "README_OPEN_FIRST.md",
    "filename": "README_OPEN_FIRST.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2989,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_a8013a78afd35441aecf190b5d00913c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "TEAM_EMAIL_v2.md",
    "filename": "TEAM_EMAIL_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1227,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_617b455cbdb55811b038f135aea3e9d3",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "TEAM_UPDATE_v2.md",
    "filename": "TEAM_UPDATE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1145,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_853bfcfe6abb5601ae6fd7d054b65f64",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "WORK_SUMMARY.html",
    "filename": "WORK_SUMMARY.html",
    "contentType": "text/html; charset=utf-8",
    "bytes": 8548,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c940fdc13c4a50199be669a725287622",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12",
      "CH06"
    ],
    "kind": "resource",
    "title": "EP12_WORK_BUNDLE.zip",
    "filename": "EP12_WORK_BUNDLE.zip",
    "contentType": "application/zip",
    "bytes": 8462,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1798c59f96f55872bd21f17a6cd73328",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12",
      "CH06"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP12_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 17350,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_75e19bb5e91457a29dd717cf774b7ac8",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "video",
    "title": "EP13_OFFICE_CODEX_v05.mp4",
    "filename": "EP13_OFFICE_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 3227033,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_b451637d7581551583a6722742976388",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "captions",
    "title": "EP13_OFFICE_CODEX_v05.srt",
    "filename": "EP13_OFFICE_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 2507,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1b8d6f7d0386514a86d99312efd7f858",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "01_OFFICE_SOURCE_v1.md",
    "filename": "01_OFFICE_SOURCE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4181,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6a51064583d15ec19381c2e2d8c45119",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "02_BAD_DRAFT_AND_REVIEW.md",
    "filename": "02_BAD_DRAFT_AND_REVIEW.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1736,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_95e7212c6520585c960efbe993f274fa",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "03_TEAM_UPDATE_v1.md",
    "filename": "03_TEAM_UPDATE_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1178,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1f0a7a9bdb6a5c03830f4308ad6df9bd",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "04_TEAM_EMAIL_v1.md",
    "filename": "04_TEAM_EMAIL_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1329,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_2f039e0cfa2a599c94ba375225595fc3",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "05_ACTIONS_v1.csv",
    "filename": "05_ACTIONS_v1.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1057,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e81bfe1f11ed5952bbf305086e25141f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "06_NEW_INFORMATION.md",
    "filename": "06_NEW_INFORMATION.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 632,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f93017030c955a2ebd1cf6ee8380ca7f",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "07_OFFICE_SOURCE_v2.md",
    "filename": "07_OFFICE_SOURCE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4955,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c7830802fe9d57a2b74996c954372273",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "08_TEAM_UPDATE_v2.md",
    "filename": "08_TEAM_UPDATE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1145,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_61d04c77e2a6514c9e16eea5171e2eb4",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "09_TEAM_EMAIL_v2.md",
    "filename": "09_TEAM_EMAIL_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1227,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_efc598b5181259f7a6bafd8fd8aaeb3a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "10_ACTIONS_v2.csv",
    "filename": "10_ACTIONS_v2.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1172,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_bc52409ca9265df689a74c87dbeb8764",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "11_WORK_SUMMARY.html",
    "filename": "11_WORK_SUMMARY.html",
    "contentType": "text/html; charset=utf-8",
    "bytes": 8560,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_19d7ad2db9615908a8f0ce8a8aaf1026",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "12_RUN_THE_CASE.md",
    "filename": "12_RUN_THE_CASE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 5104,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_3ff09c90969a54ab875fe46c7aca71bd",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "13_REUSABLE_OFFICE_RECIPE.md",
    "filename": "13_REUSABLE_OFFICE_RECIPE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2236,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_59f3dfa29c475aca82eb823b628bf907",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "04_TEAM_EMAIL_v1.md",
    "filename": "04_TEAM_EMAIL_v1.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1329,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_65ea1c33fc5a5c36a6d63871fd318e37",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "06_NEW_INFORMATION.md",
    "filename": "06_NEW_INFORMATION.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 632,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b4c827c71a6353a2aff307e08faa17f1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "07_OFFICE_SOURCE_v2.md",
    "filename": "07_OFFICE_SOURCE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4955,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_403026204c5a52c692486ea893322305",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "08_TEAM_UPDATE_v2.md",
    "filename": "08_TEAM_UPDATE_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1145,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_1252e7e0554e50b091436244fb2f8640",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "09_TEAM_EMAIL_v2.md",
    "filename": "09_TEAM_EMAIL_v2.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1227,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_cb21bc16beab5a6c88e6fbbf25f2c3a1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "10_ACTIONS_v2.csv",
    "filename": "10_ACTIONS_v2.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 1172,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_af1a0f06bc4550ba9800e0cb5b0ce1d1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "EMAIL_QUESTION_CHANGE_PREPARED.md",
    "filename": "EMAIL_QUESTION_CHANGE_PREPARED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2279,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_5f7f6e01b3845e4686628e73d15357a1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "PICKUPS_V05_FILES.zip",
    "filename": "PICKUPS_V05_FILES.zip",
    "contentType": "application/zip",
    "bytes": 5230,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_cc85e967c4355ba5810e83b1196e3bb7",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP13_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 24976,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_cbe43d55fcc85c9183381f916656b253",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "video",
    "title": "EP14_BUSINESS_CODEX_v05.mp4",
    "filename": "EP14_BUSINESS_CODEX_v05.mp4",
    "contentType": "video/mp4",
    "bytes": 6153987,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_9f15fe75c9f9524eb4f93fa0b0356519",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "captions",
    "title": "EP14_BUSINESS_CODEX_v05.srt",
    "filename": "EP14_BUSINESS_CODEX_v05.srt",
    "contentType": "application/x-subrip",
    "bytes": 4673,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_43d25d65ac7e5d2abbae047945c4f7bb",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "01_BAKERY_SOURCE_v03.md",
    "filename": "01_BAKERY_SOURCE_v03.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 14550,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f319fd8fe0dd51b5b02a8222db8a5d6b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "02_BAD_POST_AND_REVIEW.md",
    "filename": "02_BAD_POST_AND_REVIEW.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1786,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9e18a83cb79757bd92e3e9b811e2d590",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "03_POST_REVIEWED.md",
    "filename": "03_POST_REVIEWED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1108,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_027f308571635ace8116ea3dd5a30008",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "04_CUSTOMER_REPLY_REVIEWED.md",
    "filename": "04_CUSTOMER_REPLY_REVIEWED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1652,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b68eab597f325382af724d4b8173f388",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "05_PROPOSAL_INTERNAL.md",
    "filename": "05_PROPOSAL_INTERNAL.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3519,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_86f59ec57c41506bb2ac96a7a0641189",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "06_QUESTIONS_TO_CONFIRM.md",
    "filename": "06_QUESTIONS_TO_CONFIRM.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2099,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f8ae4a0ca419551a94ad803ff011b0f4",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "07_SIX_STEP_WALKTHROUGH.md",
    "filename": "07_SIX_STEP_WALKTHROUGH.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 4806,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b67f840a111a54bcaf633aef1875dd28",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "08_PRICE_CHECK.csv",
    "filename": "08_PRICE_CHECK.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 978,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_0af7db4b63c05222a33205218f4d06fb",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "09_BUSINESS_SUMMARY.html",
    "filename": "09_BUSINESS_SUMMARY.html",
    "contentType": "text/html; charset=utf-8",
    "bytes": 5852,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_97633a9093dd5df986a3edbe0186654a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "10_BUSINESS_RECIPE.md",
    "filename": "10_BUSINESS_RECIPE.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2164,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_b465b68f73575a78b4e122b88e5ea2f4",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "01_BAKERY_SOURCE_v03.md",
    "filename": "01_BAKERY_SOURCE_v03.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 14550,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9ec0efc9b1dd5bf7b9a20c24ebb3b47b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "03_POST_REVIEWED.md",
    "filename": "03_POST_REVIEWED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1108,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_661b7d68392d5723b9ef3d79b11cc448",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "04_CUSTOMER_REPLY_REVIEWED.md",
    "filename": "04_CUSTOMER_REPLY_REVIEWED.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 1652,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_a8c5639c7312567ca6eeeee258e84762",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "05_PROPOSAL_INTERNAL.md",
    "filename": "05_PROPOSAL_INTERNAL.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3519,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_284b3e1fe5555e618cf492b2beadd820",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "06_QUESTIONS_TO_CONFIRM.md",
    "filename": "06_QUESTIONS_TO_CONFIRM.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 2099,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_12e6a4ac38ad515f84a5e8c900882203",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "08_PRICE_CHECK.csv",
    "filename": "08_PRICE_CHECK.csv",
    "contentType": "text/csv; charset=utf-8",
    "bytes": 978,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_4cbc093b7202585d8e9c6d3758520a6d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "PICKUPS_V05_FILES.zip",
    "filename": "PICKUPS_V05_FILES.zip",
    "contentType": "application/zip",
    "bytes": 8200,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_80102a02bbe35ebd9f9641c01ef42599",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "THREE_FORMAT_REQUESTS_READY.md",
    "filename": "THREE_FORMAT_REQUESTS_READY.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 3094,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e492599ae582584593eea3e47175d04a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "EP14_EXAMPLE_FILES.zip",
    "filename": "EP14_EXAMPLE_FILES.zip",
    "contentType": "application/zip",
    "bytes": 12613,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_6b717836c3bf50bd852ea03d5c2d24bb",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "ไฟล์ฝึกทั้งหมดของบทนี้",
    "filename": "EP14_LEARNER_FILES.zip",
    "contentType": "application/zip",
    "bytes": 30994,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_ef3ab2740be95924882cd2faadbd7cf7",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV01"
    ],
    "kind": "resource",
    "title": "เครื่องมือจัด Source แบบพกไปใช้",
    "filename": "SOURCE_WORKBENCH.zip",
    "contentType": "application/zip",
    "bytes": 5688,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_131fb4ef6b45519284bb0d00d5f676b6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "CH06"
    ],
    "kind": "video",
    "title": "ADV06_AI_SAUCE_v06.mp4",
    "filename": "ADV06_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 18624463,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_3ee03baa3b14555db2fa2347c93ae6f2",
    "courseId": "ai-sauce",
    "lessonIds": [
      "CH06"
    ],
    "kind": "captions",
    "title": "ADV06_AI_SAUCE_v06.srt",
    "filename": "ADV06_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 10871,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_2da75aad343557619aa612c66d0de710",
    "courseId": "ai-sauce",
    "lessonIds": [
      "DUNGEON"
    ],
    "kind": "video",
    "title": "DUNGEON_AI_SAUCE_v06.mp4",
    "filename": "DUNGEON_AI_SAUCE_v06.mp4",
    "contentType": "video/mp4",
    "bytes": 27696418,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_e3aa689ce60e5a8888c2dc29d1fa58b0",
    "courseId": "ai-sauce",
    "lessonIds": [
      "DUNGEON"
    ],
    "kind": "captions",
    "title": "DUNGEON_AI_SAUCE_v06.srt",
    "filename": "DUNGEON_AI_SAUCE_v06.srt",
    "contentType": "application/x-subrip",
    "bytes": 22402,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dfa69d78bee75457a741e485b1860914",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_EP01.mp4",
    "contentType": "video/mp4",
    "bytes": 2214065,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_d4bbd64f85e85afd8bd884486b16192d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01"
    ],
    "kind": "captions",
    "title": "คำบรรยายบทเรียน",
    "filename": "EP01.srt",
    "contentType": "application/x-subrip",
    "bytes": 1230,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_eb46fe6665c557478016a193bb523b84",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_EP05.mp4",
    "contentType": "video/mp4",
    "bytes": 2739345,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_55803610be76592fbbd1f53f544a86af",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "captions",
    "title": "คำบรรยายบทเรียน",
    "filename": "EP05.srt",
    "contentType": "application/x-subrip",
    "bytes": 1396,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_a26a78e002f453909a8829215ab11b46",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_EP06.mp4",
    "contentType": "video/mp4",
    "bytes": 795782,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_6762be17ad8754a1a78b951d446f0be9",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "captions",
    "title": "คำบรรยายบทเรียน",
    "filename": "EP06.srt",
    "contentType": "application/x-subrip",
    "bytes": 809,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_8ca75051f5bf56c38fad903d7d690c23",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_EP10.mp4",
    "contentType": "video/mp4",
    "bytes": 2572291,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_8bec6fe775ba530e95f0ad0433e84b4c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "captions",
    "title": "คำบรรยายบทเรียน",
    "filename": "EP10.srt",
    "contentType": "application/x-subrip",
    "bytes": 1232,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f42016ac75555ddaa241c6c8d8b3e07c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV02"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_ADV02.mp4",
    "contentType": "video/mp4",
    "bytes": 17147681,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_9c578b5a18f454cdaa63379d081a9ef2",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV05"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_ADV05.mp4",
    "contentType": "video/mp4",
    "bytes": 12808493,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_e6db521b70c8549ebbb773a5793a3d15",
    "courseId": "ai-sauce",
    "lessonIds": [
      "DUNGEON"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_CONTINUE.mp4",
    "contentType": "video/mp4",
    "bytes": 28377685,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_8376c8da70985157bbc0aed2dac85534",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "title": "ภาพจากซอสของคุณ",
    "filename": "image-from-source.jpg",
    "contentType": "image/jpeg",
    "bytes": 73188,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_bcf8dce06e4d57d0a8b4a08b3bfe9ef6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "title": "ซอสที่กลายเป็นหน้าเว็บ",
    "filename": "website-from-source-preview.jpg",
    "contentType": "image/jpeg",
    "bytes": 78961,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_d330205d1b05586ebdf9bebb519223cd",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "title": "ข้อมูลที่กลายเป็นโลกให้คนเล่น",
    "filename": "dungeon-source-game.jpg",
    "contentType": "image/jpeg",
    "bytes": 49243,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_1186a629f49d5b2b976252e90a381563",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เริ่มจากคลาสจริง: เลือกเครื่องมือและเข้าใจซอส",
    "filename": "AI_SAUCE_FOUNDATION_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 7841,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_68c3bd42105d5cca9a1a802e335d1fb8",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP01"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เริ่มจากซอส: ให้ AI รู้จักงานของคุณ",
    "filename": "AI_SAUCE_EP01_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 5888,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_83adbb18100955deb3fab8455ec20765",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เอาความรู้ออกจากเสียง ไฟล์ และแชต",
    "filename": "AI_SAUCE_EP02_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 11848,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_01d4d6ab63b159a192fd1752338aea1d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV01"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · สกัดซอส เก็บเป็นไฟล์ แล้วตรวจให้ตรงตัวเรา",
    "filename": "AI_SAUCE_ADV01_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 37934,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_fb1b0774c8ca592492f6186e3f8af268",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ทำซอสขวดแรกที่เปิดใช้ต่อได้",
    "filename": "AI_SAUCE_EP03_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 20256,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_f9d81ee14bc05c41a58a96fea8a05c71",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ชิมงานแรก: ดูให้ออกว่าขาดอะไร",
    "filename": "AI_SAUCE_EP04_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 17465,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_0886c3df13865b239ce627c9bf3d0396",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV02"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ชิมซอสด้วยภาพ แล้วเลือกภาพไปทำต่อ",
    "filename": "AI_SAUCE_ADV02_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 24891,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_d7f53767787352ad9622c5a390197fb6",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP05"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · แก้ให้ตรงจุด แล้วเติมกลับลงซอส",
    "filename": "AI_SAUCE_EP05_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 20492,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_7f8af56dbc4d5f58966a2af65cd62b6a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP06"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · บอกโจทย์รอบนี้ให้ชัด",
    "filename": "AI_SAUCE_EP06_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 16831,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_40c75725def15dc1a2e1d774e3b64d34",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP07"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ทดลองทำงานชิ้นแรกจากซอสของคุณ",
    "filename": "AI_SAUCE_EP07_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 22012,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_843340792bdc5203bef51bba5d60b41b",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV03"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ผสมซอสกับภาพ แล้วสร้างวิดีโอ",
    "filename": "AI_SAUCE_ADV03_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 24989,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_35f3280ae959523dae1c0db74c7c7bdb",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ซอสขวดเดียว ทำงานได้หลายแบบ",
    "filename": "AI_SAUCE_EP08_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 14855,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_e5480e37f0d75a51ab9e65afbdddee56",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV04"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ใช้ซอสเดียวแตกงาน แล้วชิมผลก่อนส่งต่อ",
    "filename": "AI_SAUCE_ADV04_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 32423,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_910345b5e93a511391c4f7caf636e0b8",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เปลี่ยนรูปแบบ โดยไม่เปลี่ยนข้อเท็จจริง",
    "filename": "AI_SAUCE_EP09_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 14688,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_367ea8c564085d0c903bf2f9af1e6962",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV05"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เลือกและผสมคำสั่งให้ซอสตรงงาน",
    "filename": "AI_SAUCE_ADV05_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 48826,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_0e00f77cd0da5b0d84f8a3bdb6e87d8d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เก็บสูตรประจำงานให้หยิบใช้ได้",
    "filename": "AI_SAUCE_EP10_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 15989,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dc216c5201d75dc9b52c29b293385a97",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ข้อมูลเปลี่ยน ก็ปรับซอสให้ทัน",
    "filename": "AI_SAUCE_EP11_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 17168,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_9fb7e761f650502caad592654592b17e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "CH06"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · สร้างหน้าเว็บจากซอส แล้วปรับใน HTML Preview",
    "filename": "AI_SAUCE_CH06_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 20517,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_8f5a7af980e655e9b67ef3c6bc2af2ee",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ส่งทั้งงานและซอส ให้คนอื่นทำต่อ",
    "filename": "AI_SAUCE_EP12_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 26816,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_aa74b27cd0ae54f8bb612111952d0283",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · พาทำงานสำนักงาน: อัปเดตทีม อีเมล และรายการงาน",
    "filename": "AI_SAUCE_EP13_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 25964,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_c2c05257a943577ab0ae74fcc0ed5f6d",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · พาทำงานธุรกิจ: โพสต์ ตอบลูกค้า และข้อเสนอ",
    "filename": "AI_SAUCE_EP14_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 30427,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_958d2c0d7b3253d3ad9a047157507915",
    "courseId": "ai-sauce",
    "lessonIds": [
      "DUNGEON"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · จากซอสหนึ่งขวด สู่โลกที่คุณสร้างได้",
    "filename": "AI_SAUCE_DUNGEON_LEARNER_FILES_V4.zip",
    "contentType": "application/zip",
    "bytes": 6464,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_dcd9abbbefe457e8b7820319bb8affe1",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV04"
    ],
    "kind": "resource",
    "title": "ซอสตัวอย่างจริงของครู · myClover",
    "filename": "myclover_GLHF_7C_GrowthOS_Source.md",
    "contentType": "text/markdown; charset=utf-8",
    "bytes": 25182,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_08098d73bcb450aab59f8e509d85470e",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV05"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "AI_SAUCE_ADV05_PRIVATE_v08.mp4",
    "contentType": "video/mp4",
    "bytes": 12795926,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_fbcb3c7aad0816213a8eeb8430eba847",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "entitlement": "ai-sauce-companion-v1",
    "title": "คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น",
    "filename": "AI_SAUCE_FIELD_GUIDE.pdf",
    "contentType": "application/pdf",
    "disposition": "attachment",
    "bytes": 3098340,
    "previewAllowed": false
  },
  {
    "id": "m_4175a4b0038580f97018e45d277e9d5a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "entitlement": "ai-sauce-companion-v1",
    "title": "AI คู่คิด · พางานไปจนใช้ได้",
    "filename": "AI_SAUCE_WORK_COACH.md",
    "contentType": "text/markdown; charset=utf-8",
    "disposition": "attachment",
    "bytes": 33910,
    "previewAllowed": false
  },
  {
    "id": "m_2f22900ffa6e4e37cf775b77aa93e459",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP02"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เอาความรู้ออกจากเสียง ไฟล์ และแชต",
    "filename": "AI_SAUCE_EP02_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 11685,
    "previewAllowed": false
  },
  {
    "id": "m_1495db5162b2602a050af9b3872fd87c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV01"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · สกัดซอส เก็บเป็นไฟล์ แล้วตรวจให้ตรงตัวเรา",
    "filename": "AI_SAUCE_ADV01_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 38695,
    "previewAllowed": false
  },
  {
    "id": "m_44689d546ea5e654aa2258be66e955ac",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP03"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ทำซอสขวดแรกที่เปิดใช้ต่อได้",
    "filename": "AI_SAUCE_EP03_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 20332,
    "previewAllowed": false
  },
  {
    "id": "m_7f5c461159c0921746bb1db9526ac977",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP04"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ชิมงานแรก: ดูให้ออกว่าขาดอะไร",
    "filename": "AI_SAUCE_EP04_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 17560,
    "previewAllowed": false
  },
  {
    "id": "m_9c4176f408aaba2e7b85fd09cd8e0639",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV02"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ชิมซอสด้วยภาพ แล้วเลือกภาพไปทำต่อ",
    "filename": "AI_SAUCE_ADV02_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 25012,
    "previewAllowed": false
  },
  {
    "id": "m_91cbe15dbd7a52fade47a516330901ca",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV03"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ผสมซอสกับภาพ แล้วสร้างวิดีโอ",
    "filename": "AI_SAUCE_ADV03_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 25078,
    "previewAllowed": false
  },
  {
    "id": "m_436a91bd0a246293468e43a64a11f1d8",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP08"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ซอสขวดเดียว ทำงานได้หลายแบบ",
    "filename": "AI_SAUCE_EP08_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 14886,
    "previewAllowed": false
  },
  {
    "id": "m_a71fa3f0e10db1f513f1a26ffa438d68",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV04"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ใช้ซอสเดียวแตกงาน แล้วชิมผลก่อนส่งต่อ",
    "filename": "AI_SAUCE_ADV04_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 32849,
    "previewAllowed": false
  },
  {
    "id": "m_033754b1819c8545fd0189a72a121cfc",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP09"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เปลี่ยนรูปแบบ โดยไม่เปลี่ยนข้อเท็จจริง",
    "filename": "AI_SAUCE_EP09_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 14702,
    "previewAllowed": false
  },
  {
    "id": "m_5aa0f68bf0caedecd2285197edb3471a",
    "courseId": "ai-sauce",
    "lessonIds": [
      "ADV05"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เลือกและผสมคำสั่งให้ซอสตรงงาน",
    "filename": "AI_SAUCE_ADV05_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 48969,
    "previewAllowed": false
  },
  {
    "id": "m_1df526f8487e1850196421ed86e69fd5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP10"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · เก็บสูตรประจำงานให้หยิบใช้ได้",
    "filename": "AI_SAUCE_EP10_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 16557,
    "previewAllowed": false
  },
  {
    "id": "m_5e96b067fcade0044d43a1c56b1ec2eb",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP11"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ข้อมูลเปลี่ยน ก็ปรับซอสให้ทัน",
    "filename": "AI_SAUCE_EP11_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 17195,
    "previewAllowed": false
  },
  {
    "id": "m_f16475085a17a612744466e3a0a63a03",
    "courseId": "ai-sauce",
    "lessonIds": [
      "CH06"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · สร้างหน้าเว็บจากซอส แล้วปรับใน HTML Preview",
    "filename": "AI_SAUCE_CH06_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 20558,
    "previewAllowed": false
  },
  {
    "id": "m_69578d48dc40a25f754f171031c4ba08",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP12"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · ส่งทั้งงานและซอส ให้คนอื่นทำต่อ",
    "filename": "AI_SAUCE_EP12_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 26929,
    "previewAllowed": false
  },
  {
    "id": "m_5930398987efcf38ff0cca1acdc1e609",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP13"
    ],
    "kind": "resource",
    "title": "ชุดไฟล์ฝึก · พาทำงานสำนักงาน: อัปเดตทีม อีเมล และรายการงาน",
    "filename": "AI_SAUCE_EP13_LEARNER_FILES_V6.zip",
    "contentType": "application/zip",
    "disposition": "attachment",
    "bytes": 25992,
    "previewAllowed": false
  },
  {
    "id": "m_f4c66e8beddbcc8b181ca1644921b9b9",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "video",
    "title": "EP14_BUSINESS_CODEX_v05.mp4",
    "filename": "EP14_BUSINESS_CODEX_v08.mp4",
    "contentType": "video/mp4",
    "bytes": 4695392,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_324c2d1ee348b75bfe5bf2b0cd017452",
    "courseId": "ai-sauce",
    "lessonIds": [
      "EP14"
    ],
    "kind": "captions",
    "title": "EP14_BUSINESS_CODEX_v05.srt",
    "filename": "EP14_BUSINESS_CODEX_v08.srt",
    "contentType": "application/x-subrip",
    "bytes": 3711,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_4ae404912e3ed1f49df2a4ddad1832a5",
    "courseId": "ai-sauce",
    "lessonIds": [
      "DUNGEON"
    ],
    "kind": "video",
    "title": "วิดีโอบทเรียน",
    "filename": "DUNGEON_AI_SAUCE_v08.mp4",
    "contentType": "video/mp4",
    "bytes": 30492951,
    "disposition": "inline",
    "previewAllowed": false
  },
  {
    "id": "m_2824b84b7bb015cda9a0efa062b90f86",
    "courseId": "ai-sauce",
    "lessonIds": [
      "DUNGEON"
    ],
    "kind": "captions",
    "title": "DUNGEON_AI_SAUCE_v06.srt",
    "filename": "DUNGEON_AI_SAUCE_v08.srt",
    "contentType": "application/x-subrip",
    "bytes": 23368,
    "disposition": "attachment",
    "previewAllowed": false
  },
  {
    "id": "m_7442bf578d1f80ebe7e8836fed65a8ac",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "entitlement": "ai-sauce-companion-v1",
    "title": "คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น",
    "filename": "AI_SAUCE_FIELD_GUIDE.pdf",
    "contentType": "application/pdf",
    "disposition": "attachment",
    "bytes": 3142352,
    "previewAllowed": false
  },
  {
    "id": "m_239d031ddb6bd86394fe85595fd6c78c",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "entitlement": "ai-sauce-companion-v1",
    "title": "คู่มือ AI ใส่ซอส · อ่านให้เข้าใจ ใช้ให้เป็น",
    "filename": "AI_SAUCE_FIELD_GUIDE.pdf",
    "contentType": "application/pdf",
    "disposition": "attachment",
    "bytes": 4256931,
    "previewAllowed": false
  },
  {
    "id": "m_1d54eb10f819fecc15b9bb13c68f3299",
    "courseId": "ai-sauce",
    "lessonIds": [
      "FOUNDATION"
    ],
    "kind": "resource",
    "entitlement": "ai-sauce-companion-v1",
    "title": "AI ใส่ซอส · ผู้ช่วยงานของคุณ",
    "filename": "AI_SAUCE_WORK_COACH.md",
    "contentType": "text/markdown; charset=utf-8",
    "disposition": "attachment",
    "bytes": 38416,
    "previewAllowed": false
  }
];

export function getLearnCourse(courseId) {
  return LEARN_COURSES.find(course => course.id === courseId) || null;
}
export function getLearnLesson(courseId, lessonId) {
  return getLearnCourse(courseId)?.lessons.find(lesson => lesson.id === lessonId) || null;
}
export function getLearnAssetMetadata(assetId) {
  return LEARN_ASSETS.find(asset => asset.id === assetId) || null;
}
