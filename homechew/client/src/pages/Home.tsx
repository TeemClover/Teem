/**
 * HomeChew Sale Page — "Golden Craft" Design
 * Design: Artisan Craft + Luxury Packaging Aesthetic
 * Colors: Obsidian Black (#111111) + Matte Gold (#C9A84C) + Warm Cream
 * Layout: Asymmetric "Unboxing Experience" — each section reveals like opening a premium box
 */

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Leaf,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";

// Image URLs
const IMAGES = {
  hero: "https://private-us-east-1.manuscdn.com/sessionFile/7y2LBklHki1nwob3BJuE1H/sandbox/NEFFxUkGsODJtvnrnyo1R3-img-1_1771041916000_na1fn_aG9tZWNoZXctaGVyby1iYW5uZXI.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN3kyTEJrbEhraTFud29iM0JKdUUxSC9zYW5kYm94L05FRkZ4VWtHc09ESnR2bnJueW8xUjMtaW1nLTFfMTc3MTA0MTkxNjAwMF9uYTFmbl9hRzl0WldOb1pYY3RhR1Z5YnkxaVlXNXVaWEkuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=CPivJh16Imyr814YO5sMipWkT~QbX7cTpkYSxRXSA5D0uU~pYxSLHPxxeWVkn~MjaiUxJOGzOJG6haU3gymlCOrjz49NG13gCqlm8XEZx0FrLVBKe~9mT12UMLGaLLrM3yMGkCe4LvCO5QxpWDEE7dHNjcE2AS9ziOH5jSdivuSUQaRIsdqJetK1WrdKVqYcw5bbIxluNp0SafRxv4uRm7YP9lczp2J~aKYaRoFWHbt882GgxAhXQDKObbEoXZUdiH-y2hZXnV4~imqR25GdcN5zhEIiJW~ADKsGi2K7uYd1-zck~4EyYLOqHAwcNEGn~m7R1yu~7EdS49TfwQwfGA__",
  goldenOil: "https://private-us-east-1.manuscdn.com/sessionFile/7y2LBklHki1nwob3BJuE1H/sandbox/NEFFxUkGsODJtvnrnyo1R3-img-2_1771041919000_na1fn_aG9tZWNoZXctZ29sZGVuLW9pbA.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN3kyTEJrbEhraTFud29iM0JKdUUxSC9zYW5kYm94L05FRkZ4VWtHc09ESnR2bnJueW8xUjMtaW1nLTJfMTc3MTA0MTkxOTAwMF9uYTFmbl9hRzl0WldOb1pYY3RaMjlzWkdWdUxXOXBiQS5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=OsK649BXjhOp6fBZq~8BKFJ2DPv2hS4UWIK585Gd3BUM5USCqM1ZvpUFLw94HR4qLe7Us34jWSosWcJRaH3CraV3MQDM1VDdUKvfEjBeALQjIUHd~CW11pkYOG-qx5mbPLLHyWeNJg8Do83PfWgd6fq1U6xMAga33pJovekg1XZAeWZ-VKkazo26lCrtihwQqBiytbN7qlILsdpxB-Z3OIsUReF~GzfyIhDWou-r2l7htOuliGua4JfvXOQFELt0p6ZTwNy59aTneYvXJLi0-4WovUhj3q45NzLu62rL1I8cSR0cSmzt2OCMyVcbHlSDvLAoq20wHNi262z4sH7ocA__",
  product: "https://private-us-east-1.manuscdn.com/sessionFile/7y2LBklHki1nwob3BJuE1H/sandbox/NEFFxUkGsODJtvnrnyo1R3-img-3_1771041974000_na1fn_aG9tZWNoZXctcHJvZHVjdC1wcmVtaXVt.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN3kyTEJrbEhraTFud29iM0JKdUUxSC9zYW5kYm94L05FRkZ4VWtHc09ESnR2bnJueW8xUjMtaW1nLTNfMTc3MTA0MTk3NDAwMF9uYTFmbl9hRzl0WldOb1pYY3RjSEp2WkhWamRDMXdjbVZ0YVhWdC5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=vqZSdqHStCyICNQdjNg22Y9~BdSTyb2oXe26Gd6Jva3U5CcZEAHXepSdCTNqJWUorNYl9YBMUN2q48Px16pw4YLpjqimUXDI5lgNLSIYrCFFPbTcm~2zqKBSIruS6vtB4hamb5vkLNv7AlLVsR0xxrVfbZLZ4RaXLceax5eJloeYfW-EbFiueCPptsWKvLlj-eWBq3Gtl6m0PKtGG6AJVk~06Nv5gVyif6Q~rAmU61xQMPBWTGIEAVX3gFGyWpYxEg7AwurmnWTJj4emZRoqUbGQkPKnrf3G1nv2el3VZckf07xn66EkLDZkwkn9JtFgd7pLDt9w1rFqqeyOyNwA7w__",
  comparison: "https://private-us-east-1.manuscdn.com/sessionFile/7y2LBklHki1nwob3BJuE1H/sandbox/NEFFxUkGsODJtvnrnyo1R3-img-4_1771041922000_na1fn_aG9tZWNoZXctY29tcGFyaXNvbg.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN3kyTEJrbEhraTFud29iM0JKdUUxSC9zYW5kYm94L05FRkZ4VWtHc09ESnR2bnJueW8xUjMtaW1nLTRfMTc3MTA0MTkyMjAwMF9uYTFmbl9hRzl0WldOb1pYY3RZMjl0Y0dGeWFYTnZiZy5qcGc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=jW3mpmvqY~Bm5TSHtFj96jlEVxFk05px1KFYvHV6ffB5sUaWiHR7ih~Mhdbb4A4Tveq4HncpeAEAv8twHlNnC9sJp9TyelCQb1GeGNSFS9ilol6NxGzf8RacHgSnDLzTJsHHHMWQwXaQf75TduV7yEny-e17CIySEYm6RnWVyMlzjp-7wVZySVHl6g3t8DM5y0bsTxCQZXgxGpc~vxbkzbjcN7b9kaGlbldskjPBZQBr7E0R9XqlsOlBMO6kXyk-Vl-A4mQmZl~I73Qjy3HAtvez1VNESOdEy2Q9J3QLEkJiFp5ur2rU514DLubTnbx1QuSx63pfxYyl9i2LRxC1OQ__",
  menuHack: "https://private-us-east-1.manuscdn.com/sessionFile/7y2LBklHki1nwob3BJuE1H/sandbox/NEFFxUkGsODJtvnrnyo1R3-img-5_1771041919000_na1fn_aG9tZWNoZXctbWVudS1oYWNr.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvN3kyTEJrbEhraTFud29iM0JKdUUxSC9zYW5kYm94L05FRkZ4VWtHc09ESnR2bnJueW8xUjMtaW1nLTVfMTc3MTA0MTkxOTAwMF9uYTFmbl9hRzl0WldOb1pYY3RiV1Z1ZFMxb1lXTnIuanBnP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=MYSkFa7DqCfPaIBkgNmolVW49Il7zBeQGsM6npYVMpmsNbXOtOHTaPoa0kOMQQPZiZMuOY4kiaYBxe0G68g-UZEkUpex7ancjJUj4Fn3Wmxfdug~uTAPqWL9E2qxZiWxEJJc7AyPDHkAxoWIHkoDszDB-~yVthIp1lcuYQ1F1TG8p6HnGMLjDHlGGD7462tg563adSLlWoDEmuo1Z3--qFGBOipMbC8MVRDtH0DBmIZ7GocaL0aONv0vVCkuinLLEOKR~9XX3vI8Cysj0TzSBcnr6DgLAYE7dUhRygFbn3Aqwfi6eyUgglT~70YuWC4OQfE5iklw6TpvaOuoKhBAbQ__",
};

// Reusable animated section wrapper
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Gold divider line
function GoldDivider() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="py-8 flex justify-center">
      <motion.div
        initial={{ width: 0 }}
        animate={isInView ? { width: "60%" } : { width: 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="h-px bg-gradient-to-r from-transparent via-gold to-transparent"
      />
    </div>
  );
}

// Counter animation
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// FAQ Accordion Item
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gold/20 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gold/5 transition-colors"
      >
        <span className="font-semibold text-cream pr-4">{question}</span>
        {open ? <Minus className="w-5 h-5 text-gold shrink-0" /> : <Plus className="w-5 h-5 text-gold shrink-0" />}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 text-cream/70 leading-relaxed">{answer}</div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#111111] text-[#F5E6C8] overflow-x-hidden">
      {/* ===== 1. STICKY NAVBAR ===== */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          navScrolled
            ? "bg-[#111111]/95 backdrop-blur-md shadow-lg shadow-black/30 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container flex items-center justify-between">
          <button onClick={() => scrollToSection("hero")} className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 text-gold group-hover:rotate-12 transition-transform" />
            <span className="text-xl font-bold text-gold tracking-wide">โฮมเจียววว</span>
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="bg-gold text-[#111111] px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-gold-light transition-all hover:scale-105 active:scale-95 animate-pulse-gold"
          >
            สั่งซื้อเลย
          </button>
        </div>
      </nav>

      {/* Scroll Progress Bar */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light z-[60] origin-left"
      />

      {/* ===== 2. HERO SECTION ===== */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={IMAGES.hero}
            alt="หอมเจียวพรีเมียม HomeChew"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#111111]" />
        </div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 container text-center pt-20">
          <AnimatedSection>
            <p className="text-gold/80 text-sm tracking-[0.3em] uppercase mb-4 font-medium">
              Premium Craft Fried Shallots
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight mb-6">
              <span className="animate-shimmer">เปลี่ยนทุกคำ...</span>
              <br />
              <span className="text-white">ให้เป็นตำนาน</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <p className="text-lg sm:text-xl text-cream/80 mb-10 max-w-2xl mx-auto font-light">
              <span className="text-gold font-semibold">โฮมเจียววว (HomeChew)</span>{" "}
              สูตรลับ 40 ปี จากหาดใหญ่
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <div className="flex flex-wrap justify-center gap-6 mb-12 text-sm sm:text-base">
              {[
                { icon: <Leaf className="w-5 h-5" />, text: "เนื้อหอมแดง 98%" },
                { icon: <Droplets className="w-5 h-5" />, text: "สลัดน้ำมันแห้งสนิท" },
                { icon: <ShieldCheck className="w-5 h-5" />, text: "คัดเกรด A+ โดยแม่เจียว" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-gold/20 rounded-full px-5 py-2.5">
                  <span className="text-gold">{item.icon}</span>
                  <span className="text-cream/90">{item.text}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.8}>
            <button
              onClick={() => scrollToSection("pricing")}
              className="bg-gold text-[#111111] px-10 py-4 rounded-full font-bold text-lg hover:bg-gold-light transition-all hover:scale-105 active:scale-95 animate-pulse-gold"
            >
              ลิ้มลองความกรอบ
            </button>
          </AnimatedSection>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-16"
          >
            <ChevronDown className="w-8 h-8 text-gold/50 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== 3. WARNING SECTION ===== */}
      <section className="py-16 sm:py-24">
        <div className="container max-w-3xl mx-auto">
          <AnimatedSection>
            <div className="relative border-2 border-warning-red/50 rounded-2xl p-8 sm:p-12 bg-gradient-to-br from-warning-red/10 to-transparent">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-warning-red rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-warning-red rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-warning-red rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-warning-red rounded-br-2xl" />

              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-8 h-8 text-warning-red" />
                <h2 className="text-2xl sm:text-3xl font-bold text-warning-red">
                  คำเตือน: โปรดอ่านก่อนสั่งซื้อ
                </h2>
              </div>

              <div className="space-y-4 text-cream/85 text-lg leading-relaxed">
                <p>
                  เราไม่อยากให้คุณสั่ง... ถ้ายังชอบกินแป้งทอดแบบเดิมๆ
                </p>
                <p>
                  เพราะความกรอบของ{" "}
                  <span className="text-gold font-bold">"เนื้อหอมแดงแท้"</span>{" "}
                  ที่เคลือบแป้งเพียง{" "}
                  <span className="text-gold font-bold">"ระดับไมครอน"</span>{" "}
                  จะทำให้ลิ้นของคุณเปลี่ยนไปตลอดกาล
                </p>
                <p className="text-warning-red font-semibold text-xl pt-2">
                  ระวัง! คุณอาจกลับไปกินหอมเจียวทั่วไปไม่ได้อีกเลย
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 4. PAIN POINT VS SOLUTION ===== */}
      <section className="py-16 sm:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              <span className="text-gold">ทำไม</span> ต้องเป็นโฮมเจียววว?
            </h2>
            <p className="text-center text-cream/60 mb-16 text-lg">ความแตกต่างที่ลิ้นรู้</p>
          </AnimatedSection>

          {/* Comparison Image */}
          <AnimatedSection delay={0.2}>
            <div className="rounded-2xl overflow-hidden mb-12 border border-gold/10">
              <img
                src={IMAGES.comparison}
                alt="เปรียบเทียบหอมเจียวตลาดนัด vs โฮมเจียววว"
                className="w-full h-auto"
              />
            </div>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Bad Side */}
            <AnimatedSection delay={0.3}>
              <div className="bg-white/3 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-red-900/50 text-red-300 text-xs px-3 py-1 rounded-full font-semibold">
                  หอมเจียวทั่วไป
                </div>
                <div className="space-y-5 mt-8">
                  {[
                    "แป้งหนา 50-70% เหมือนเคี้ยวแป้งทอด",
                    "อมน้ำมันเก่า เจ็บคอ เหม็นหืน",
                    "รสชาติปรุงแต่ง ไม่ใช่รสหอมแดงแท้",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-cream/60">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>

            {/* Good Side */}
            <AnimatedSection delay={0.5}>
              <div className="bg-gold/5 border border-gold/30 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-gold/20 text-gold text-xs px-3 py-1 rounded-full font-semibold">
                  โฮมเจียววว
                </div>
                <div className="space-y-5 mt-8">
                  {[
                    { bold: "แป้งบางวิญญาณ", text: " (<2% เพื่อล็อคความกรอบ)" },
                    { bold: "สลัดน้ำมันแห้งสนิท", text: " (ไม่เลี่ยน ไม่เจ็บคอ)" },
                    { bold: "หวานธรรมชาติ", text: " (รสเนื้อหอมแดงแท้ 100%)" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                      <span>
                        <span className="text-gold font-semibold">{item.bold}</span>
                        <span className="text-cream/80">{item.text}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Stats */}
          <AnimatedSection delay={0.6}>
            <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mt-16">
              {[
                { number: 98, suffix: "%", label: "เนื้อหอมแดงแท้" },
                { number: 40, suffix: " ปี", label: "สูตรต้นตำรับ" },
                { number: 0, suffix: "% น้ำมัน", label: "สลัดแห้งสนิท" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-extrabold text-gold">
                    <AnimatedCounter target={stat.number} suffix={stat.suffix} />
                  </div>
                  <div className="text-cream/50 text-sm mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 5. THE STORY: MOM & FACTORY ===== */}
      <section className="py-16 sm:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Text Side */}
            <AnimatedSection>
              <div>
                <p className="text-gold/80 text-sm tracking-[0.2em] uppercase mb-3 font-medium">Our Story</p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                  จากครัวหลังบ้าน...
                  <br />
                  <span className="text-gold">สู่โรงงานมาตรฐาน</span>
                  <br />
                  เพื่อแม่
                </h2>
                <div className="space-y-4 text-cream/75 leading-relaxed text-lg">
                  <p>
                    แม่เจียวหอมมาทั้งชีวิต กว่า <span className="text-gold font-semibold">40 ปี</span> ที่หาดใหญ่
                    ด้วยสูตรลับที่ทำให้ไก่ทอดหาดใหญ่โด่งดังไปทั่วโลก
                  </p>
                  <p>
                    แม่จู้จี้ทุกขั้นตอน ตั้งแต่คัดหอมแดงเกรด A+ ทีละหัว
                    จนถึงเช็คสีทองของหอมเจียวทุกกระทะ
                  </p>
                  <p>
                    เราจึงสร้าง <span className="text-gold font-semibold">"ห้องผลิตมาตรฐานโรงงาน"</span>{" "}
                    ให้แม่ เพื่อรักษาคุณภาพเดิม ในมาตรฐานใหม่ที่สะอาด ปลอดภัย
                    และส่งถึงมือคุณได้ทุกวัน
                  </p>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap gap-3 mt-8">
                  {["QC โดยแม่", "มาตรฐานโรงงาน", "ไม่ใช้สารกันเสีย"].map((badge, i) => (
                    <span
                      key={i}
                      className="bg-gold/10 border border-gold/30 text-gold text-xs px-4 py-2 rounded-full font-semibold tracking-wide"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </AnimatedSection>

            {/* Image Side */}
            <AnimatedSection delay={0.3}>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden border border-gold/20">
                  <img
                    src={IMAGES.product}
                    alt="สินค้าหอมเจียวพรีเมียม HomeChew"
                    className="w-full h-auto"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 bg-gold text-[#111111] px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-gold/20">
                  Premium Grade A+
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 6. THE SECRET: GOLDEN OIL ===== */}
      <section className="py-16 sm:py-24 relative">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Image Side (reversed) */}
            <AnimatedSection>
              <div className="relative order-2 lg:order-1">
                <div className="rounded-2xl overflow-hidden border border-gold/20">
                  <img
                    src={IMAGES.goldenOil}
                    alt="น้ำมันทองคำ HomeChew"
                    className="w-full h-auto"
                  />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gold/5 blur-3xl -z-10 scale-110" />
              </div>
            </AnimatedSection>

            {/* Text Side */}
            <AnimatedSection delay={0.3}>
              <div className="order-1 lg:order-2">
                <p className="text-gold/80 text-sm tracking-[0.2em] uppercase mb-3 font-medium">The Secret</p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight">
                  ความลับของ
                  <br />
                  <span className="text-gold">น้ำมันทองคำ</span>
                </h2>
                <div className="space-y-4 text-cream/75 leading-relaxed text-lg">
                  <p>
                    ทำไมร้านไก่ทอดดังๆ ถึงแย่งกันซื้อ{" "}
                    <span className="text-gold font-semibold">น้ำมันก้นกระทะ</span> ของเรา?
                  </p>
                  <p>
                    เพราะมันดูดซับ <span className="text-gold font-semibold">"หัวเชื้อความหอม"</span>{" "}
                    ของหอมแดงไว้จนหมด
                  </p>
                  <blockquote className="border-l-4 border-gold pl-6 py-2 my-6 italic text-cream/90 text-xl">
                    "ขนาดน้ำมันยังหอมขนาดนี้...
                    <br />
                    แล้วเนื้อในถุงจะขนาดไหน?"
                  </blockquote>
                </div>

                <div className="flex items-center gap-4 mt-6 bg-gold/5 border border-gold/20 rounded-xl p-4">
                  <Flame className="w-10 h-10 text-gold shrink-0" />
                  <div>
                    <div className="text-gold font-semibold">น้ำมันทองคำ</div>
                    <div className="text-cream/60 text-sm">By-product จากกระบวนการเจียวที่ร้านไก่ทอดต้องการตัว</div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 7. MENU HACKS ===== */}
      <section className="py-16 sm:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              แค่ฉีกซอง... <span className="text-gold">มื้อธรรมดาก็กลายเป็นมื้อพิเศษ</span>
            </h2>
            <p className="text-center text-cream/60 mb-12 text-lg">กินกับอะไรก็อร่อย</p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="rounded-2xl overflow-hidden border border-gold/10 mb-12">
              <img
                src={IMAGES.menuHack}
                alt="เมนูที่ใช้หอมเจียว HomeChew"
                className="w-full h-auto"
              />
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { emoji: "🍚", name: "ข้าวไข่เจียว", desc: "ฟูกรอบ ตัดเลี่ยน" },
              { emoji: "🍜", name: "มาม่า/ก๋วยเตี๋ยว", desc: "ดูดน้ำซุป ชุ่มฉ่ำ" },
              { emoji: "🍗", name: "ไก่ทอดหาดใหญ่", desc: "กำเนิดตำนาน" },
              { emoji: "🥗", name: "ยำ/ส้มตำ", desc: "นัว กรุบกริบ" },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={0.3 + i * 0.1}>
                <div className="bg-white/3 border border-gold/10 rounded-xl p-5 text-center hover:border-gold/40 hover:bg-gold/5 transition-all group">
                  <div className="text-4xl mb-3">{item.emoji}</div>
                  <div className="font-semibold text-cream group-hover:text-gold transition-colors">{item.name}</div>
                  <div className="text-cream/50 text-sm mt-1">{item.desc}</div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 8. SOCIAL PROOF ===== */}
      <section className="py-16 sm:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              <span className="text-gold"><AnimatedCounter target={1000} /></span>+ บ้าน... ยืนยันแล้ว
            </h2>
            <p className="text-center text-cream/60 mb-12 text-lg">เสียงจากคนที่ลองแล้ว</p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "คุณแอน", text: "กินแล้วหยุดไม่ได้ แฟนแย่งกินหมด! ต้องสั่งเพิ่มอีก 3 ถุง", rating: 5 },
              { name: "คุณบอส", text: "หอมเจียวที่อร่อยที่สุดที่เคยกิน ไม่เลี่ยนเลย กรอบมากจริงๆ", rating: 5 },
              { name: "คุณมิ้นท์", text: "ใส่มาม่าอร่อยสุดๆ ลูกชอบมาก ต้องมีติดบ้านตลอด", rating: 5 },
              { name: "คุณเจ", text: "เป็นคนหาดใหญ่ ยืนยันว่านี่คือรสชาติแท้ๆ ของบ้านเรา", rating: 5 },
              { name: "คุณนุ่น", text: "สั่งชุดครอบครัว 5 ถุง แจกญาติ ทุกคนติดใจหมด สั่งซ้ำแล้ว", rating: 5 },
              { name: "คุณต้น", text: "ราคา 199 แต่คุ้มค่ามาก เทียบกับตลาดนัดคนละเรื่อง", rating: 5 },
            ].map((review, i) => (
              <AnimatedSection key={i} delay={0.1 * i}>
                <div className="bg-white/3 border border-gold/10 rounded-xl p-6 hover:border-gold/30 transition-all">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-cream/80 leading-relaxed mb-4">"{review.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
                      {review.name[3]}
                    </div>
                    <span className="text-cream/60 text-sm">{review.name}</span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 9. PRICING TABLE ===== */}
      <section id="pricing" className="py-16 sm:py-24">
        <div className="container">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              เลือกความอร่อย <span className="text-gold">ส่งตรงถึงบ้าน</span>
            </h2>
            <p className="text-center text-cream/60 mb-16 text-lg">จัดส่งทั่วไทย ภายใน 1-3 วัน</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {/* Card 1: Starter */}
            <AnimatedSection delay={0.1}>
              <div className="bg-white/3 border border-white/10 rounded-2xl p-8 flex flex-col h-full hover:border-gold/30 transition-all">
                <div className="text-cream/60 text-sm font-semibold uppercase tracking-wider mb-4">ชุดลองชิม</div>
                <div className="text-5xl font-extrabold text-cream mb-1">
                  199<span className="text-lg font-normal text-cream/50">.-</span>
                </div>
                <div className="text-cream/50 text-sm mb-6">1 ถุง + ค่าส่ง 40.-</div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-cream/70 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> หอมเจียวพรีเมียม 1 ถุง
                  </li>
                  <li className="flex items-center gap-2 text-cream/70 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> น้ำหนัก 150 กรัม
                  </li>
                </ul>
                <button
                  onClick={() => window.open("https://lin.ee/homechew", "_blank")}
                  className="w-full bg-white/10 text-cream border border-white/20 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                  สั่งชุดลองชิม
                </button>
              </div>
            </AnimatedSection>

            {/* Card 2: Best Seller */}
            <AnimatedSection delay={0.2}>
              <div className="relative bg-gradient-to-b from-gold/10 to-gold/5 border-2 border-gold rounded-2xl p-8 flex flex-col h-full scale-[1.02] md:scale-105 shadow-xl shadow-gold/10">
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold text-[#111111] px-6 py-1.5 rounded-full text-sm font-bold whitespace-nowrap">
                  🏆 ขายดีที่สุด
                </div>
                <div className="text-gold text-sm font-semibold uppercase tracking-wider mb-4 mt-2">ชุดสุดคุ้ม</div>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-5xl font-extrabold text-gold">570</span>
                  <span className="text-lg text-cream/50">.-</span>
                  <span className="text-cream/40 line-through text-lg">600.-</span>
                </div>
                <div className="text-cream/60 text-sm mb-6">3 ถุง (ตกถุงละ 190.-) <span className="text-gold font-semibold">ส่งฟรี!</span></div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-cream/80 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> หอมเจียวพรีเมียม 3 ถุง
                  </li>
                  <li className="flex items-center gap-2 text-cream/80 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> ส่งฟรีทั่วไทย
                  </li>
                  <li className="flex items-center gap-2 text-cream/80 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> ประหยัด 30 บาท
                  </li>
                </ul>
                <button
                  onClick={() => window.open("https://lin.ee/homechew", "_blank")}
                  className="w-full bg-gold text-[#111111] py-3.5 rounded-xl font-bold text-lg hover:bg-gold-light transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse-gold"
                >
                  สั่งชุดสุดคุ้ม (แนะนำ)
                </button>
              </div>
            </AnimatedSection>

            {/* Card 3: Family */}
            <AnimatedSection delay={0.3}>
              <div className="bg-white/3 border border-white/10 rounded-2xl p-8 flex flex-col h-full hover:border-gold/30 transition-all">
                <div className="text-cream/60 text-sm font-semibold uppercase tracking-wider mb-4">ชุดตุน</div>
                <div className="text-5xl font-extrabold text-cream mb-1">
                  950<span className="text-lg font-normal text-cream/50">.-</span>
                </div>
                <div className="text-cream/50 text-sm mb-6">5 ถุง (ตกถุงละ 190.-) <span className="text-gold font-semibold">ส่งฟรี!</span></div>
                <ul className="space-y-3 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-cream/70 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> หอมเจียวพรีเมียม 5 ถุง
                  </li>
                  <li className="flex items-center gap-2 text-cream/70 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> ส่งฟรีทั่วไทย
                  </li>
                  <li className="flex items-center gap-2 text-cream/70 text-sm">
                    <ShieldCheck className="w-4 h-4 text-gold" /> เหมาะสำหรับครอบครัว
                  </li>
                </ul>
                <button
                  onClick={() => window.open("https://lin.ee/homechew", "_blank")}
                  className="w-full bg-white/10 text-cream border border-white/20 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all"
                >
                  สั่งชุดตุน
                </button>
              </div>
            </AnimatedSection>
          </div>

          {/* Trust strip */}
          <AnimatedSection delay={0.5}>
            <div className="flex flex-wrap justify-center gap-6 mt-12 text-cream/40 text-sm">
              {["🚚 จัดส่งทั่วไทย", "📦 แพ็คอย่างดี", "💯 ยินดีคืนเงิน", "🔒 ชำระเงินปลอดภัย"].map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <GoldDivider />

      {/* ===== 10. FAQ ===== */}
      <section className="py-16 sm:py-24">
        <div className="container max-w-3xl mx-auto">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
              คำถาม<span className="text-gold">ที่พบบ่อย</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="space-y-3">
              <FAQItem
                question="มีแป้งไหม?"
                answer="มีแป้งเคลือบบางๆ น้อยกว่า 2% เพื่อล็อคความกรอบให้คงทนนานขึ้น ไม่ใช่การชุบแป้งทอดแบบหอมเจียวทั่วไปที่มีแป้ง 50-70% เรียกว่า 'แป้งบางวิญญาณ' เพราะบางจนแทบมองไม่เห็น"
              />
              <FAQItem
                question="เก็บได้นานไหม?"
                answer="เก็บได้นาน 2 เดือนในถุงซิปล็อค เมื่อเปิดแล้วควรปิดให้สนิทและเก็บในที่แห้ง หลีกเลี่ยงความชื้น จะคงความกรอบได้นาน"
              />
              <FAQItem
                question="ทำไมราคา 199 บาท?"
                answer="เพราะเราใช้หอมแดงเกรด A+ คัดมือทุกหัว ไม่ใช้หอมแดงเกรดรอง กระบวนการผลิตทุกขั้นตอนผ่าน QC โดยแม่เจียวเอง สลัดน้ำมันแห้งสนิท ไม่เหมือนหอมเจียวตลาดนัดที่อมน้ำมันเก่า คุณจ่ายเพื่อ 'เนื้อหอมแดงแท้' ไม่ใช่ 'แป้งทอด'"
              />
              <FAQItem
                question="จัดส่งอย่างไร?"
                answer="จัดส่งทั่วไทยผ่านขนส่งเอกชน ภายใน 1-3 วันทำการ แพ็คอย่างดีด้วยกล่องกันกระแทก สั่ง 3 ถุงขึ้นไปส่งฟรี!"
              />
              <FAQItem
                question="สั่งซื้อผ่านช่องทางไหน?"
                answer="สั่งซื้อได้ผ่าน LINE Official: @homechew หรือกดปุ่ม 'สั่งซื้อเลย' บนเว็บไซต์นี้ได้เลยครับ ทีมงานจะตอบกลับภายใน 5 นาที"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gold/10 py-12">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-xl font-bold text-gold">โฮมเจียววว</span>
          </div>
          <p className="text-cream/40 text-sm mb-6">ผลิตด้วยความรักโดยแม่เจียว | สูตรต้นตำรับ 40 ปี จากหาดใหญ่</p>

          <div className="flex justify-center gap-4 mb-8">
            <a
              href="https://lin.ee/homechew"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#06C755] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              LINE: @homechew
            </a>
          </div>

          <div className="gold-line max-w-xs mx-auto mb-6" />

          <p className="text-cream/30 text-xs">
            © 2025 HomeChew (โฮมเจียววว). All rights reserved.
          </p>
        </div>
      </footer>

      {/* Floating CTA on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#111111] via-[#111111]/95 to-transparent md:hidden z-40">
        <button
          onClick={() => scrollToSection("pricing")}
          className="w-full bg-gold text-[#111111] py-4 rounded-xl font-bold text-lg animate-pulse-gold"
        >
          สั่งซื้อเลย — เริ่มต้น 199.-
        </button>
      </div>
    </div>
  );
}
