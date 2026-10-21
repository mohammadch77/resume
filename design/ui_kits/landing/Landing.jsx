const { Navbar, Button, Chip, Field, ProjectCard, Metric, Testimonial, Modal, CropFrame, CoverArt, Icon } = window.GrinWebDesignSystem_8caadf;
const D = window.LK_DATA;

function Hero(){return (
<section className="lk-wrap lk-hero" id="top">
  <div>
    <h1>سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد</h1>
    <p className="lk-lead">برای شرکت‌ها و فروشگاه‌ها وب‌سایت و نرم‌افزار اختصاصی می‌سازیم؛ سریع، قابل‌مدیریت و با زمان‌بندی روشن.</p>
    <div className="lk-actions"><Button href="#contact">{D.cta}</Button><Button variant="secondary" href="#work">مشاهده نمونه‌کارها</Button></div>
    <p className="lk-proof">[تعداد] پروژه‌ی تحویل‌شده · [تعداد] سال تجربه · <span className="gw-sample">نمونه</span></p>
  </div>
  <div className="lk-art" aria-hidden="true">
    <div className="lk-art__block"></div>
    <div className="lk-art__a"><CropFrame><CoverArt art={3} /></CropFrame></div>
    <div className="lk-art__b"><CropFrame><CoverArt art={1} sample /></CropFrame></div>
  </div>
</section>);}

function Work({onOpen}){
  const [f,setF]=React.useState("همه"); const [i,setI]=React.useState(0); const ref=React.useRef(null);
  const list=D.projects.filter(p=>f==="همه"||p.cat===f);
  const fa=n=>String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
  const onScroll=()=>{const el=ref.current;if(!el)return;const step=452;setI(Math.min(list.length-1,Math.round(Math.abs(el.scrollLeft)/step)));};
  React.useEffect(()=>{setI(0);ref.current&&(ref.current.scrollLeft=0);},[f]);
  return (
  <section className="lk-sec lk-sec--sunken" id="work">
    <div className="lk-wrap lk-strip-head">
      <h2 className="lk-h2">نمونه‌کارهای منتخب</h2>
      <div className="gw-chip-row" role="group" aria-label="فیلتر نمونه‌کارها">{D.filters.map(x=><Chip key={x} variant="filter" selected={f===x} onClick={()=>setF(x)}>{x}</Chip>)}</div>
    </div>
    <div className="lk-strip" ref={ref} onScroll={onScroll}>
      {list.map(p=><ProjectCard key={p.id} art={p.art} tags={p.tags} title={p.title} summary={p.summary} onOpen={()=>onOpen(p)} />)}
    </div>
    <div className="lk-wrap lk-progress"><div className="lk-progress__track"><div className="lk-progress__bar" style={{inlineSize:((i+1)/list.length*100)+"%"}}></div></div><span>{fa(i+1)} از {fa(list.length)}</span></div>
  </section>);}

function Services(){return (
<section className="lk-sec" id="services"><div className="lk-wrap">
  <h2 className="lk-h2">خدمات</h2>
  <div className="lk-cols">{D.services.map(s=><div className="lk-col" key={s.t}><h3>{s.t}</h3><p>{s.d}</p><div className="gw-chip-row">{s.c.map(c=><Chip key={c} variant="outline">{c}</Chip>)}</div></div>)}</div>
</div></section>);}

function Process(){return (
<section className="lk-sec" id="process" style={{paddingBlockStart:0}}><div className="lk-wrap">
  <h2 className="lk-h2">روش کار</h2>
  <ol className="lk-cols" style={{listStyle:"none",margin:0,padding:0}}>{D.steps.map((s,n)=><li className="lk-col" key={s.t}><span className="lk-step-n">{"۱۲۳۴"[n]}</span><h3>{s.t}</h3><p>{s.d}</p></li>)}</ol>
</div></section>);}

function Results(){return (
<section className="lk-sec lk-sec--sunken"><div className="lk-wrap">
  <h2 className="lk-h2">نتیجه‌ها</h2>
  <div className="lk-metrics">
    <Metric value="[عدد]٪" label="کاهش زمان ثبت سفارش" source="پروژه‌ی [نام مشتری]" sample/>
    <Metric value="[عدد]" label="پروژه‌ی تحویل‌شده" source="۱۴۰۰ تا ۱۴۰۴" sample/>
    <Metric value="[عدد]" label="روز تا نسخه‌ی اول" source="میانگین پروژه‌ها" sample/>
  </div>
  <p className="lk-note">داده‌ی واقعی از پنل مدیریت خوانده می‌شود؛ اگر داده‌ای نباشد، این بخش نمایش داده نمی‌شود.</p>
</div></section>);}

function Quote(){return (
<section className="lk-sec"><div className="lk-wrap">
  <Testimonial quote="«[متن نظر مشتری اینجا قرار می‌گیرد؛ دو تا چهار خط، بدون ویرایش و با اجازه‌ی کتبی خود او.]»" name="[نام مشتری]" role="مدیر محصول، [نام شرکت]" sample/>
</div></section>);}

function Clients(){return (
<section className="lk-sec" id="clients" style={{paddingBlockStart:0}}><div className="lk-wrap">
  <h2 className="lk-h2" style={{fontSize:"var(--text-heading-1)",lineHeight:"var(--text-heading-1--line-height)"}}>مشتریان</h2>
  <div className="lk-logos">{[1,2,3,4,5,6].map(n=><div className="lk-logo" key={n}>[لوگو]</div>)}</div>
</div></section>);}

function Contact(){
  const [sent,setSent]=React.useState(false); const [err,setErr]=React.useState("");
  const submit=e=>{e.preventDefault();const ph=e.target.phone.value.trim();if(!/^(09|۰۹)/.test(ph)){setErr("شماره را با ۰۹ شروع کنید.");return;}setErr("");setSent(true);};
  return (
  <section className="lk-sec lk-sec--sunken" id="contact"><div className="lk-wrap lk-contact">
    <div>
      <h2 className="lk-h2">درباره‌ی پروژه‌تان بگویید</h2>
      <p className="lk-lead">در یک جلسه‌ی کوتاه نیازتان را می‌شنویم و مسیر پیشنهادی را رایگان می‌گوییم.</p>
      <dl>
        <dt><Icon name="phone" size={18}/>تلفن</dt><dd dir="ltr" style={{textAlign:"right"}}>[شماره تماس]</dd>
        <dt><Icon name="mail" size={18}/>ایمیل</dt><dd dir="ltr" style={{textAlign:"right"}}>[ایمیل]</dd>
        <dt><Icon name="map-pin" size={18}/>نشانی</dt><dd>[نشانی دفتر]</dd>
      </dl>
    </div>
    <form className="lk-form" onSubmit={submit} noValidate>
      <Field label="نام و نام خانوادگی" name="name" autoComplete="name" required/>
      <Field label="شماره تماس" name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" error={err||undefined} hint={err?undefined:"فقط برای هماهنگی جلسه تماس می‌گیریم."} required/>
      <Field label="درباره‌ی پروژه" name="message" multiline optional/>
      {sent ? <p className="lk-sent" role="status"><Icon name="circle-check"/>درخواستتان رسید. تا یک روز کاری تماس می‌گیریم.</p> : <Button type="submit">{D.cta}</Button>}
      <p className="lk-note" style={{margin:0}}>با ارسال این فرم، با تماس ما برای هماهنگی جلسه موافقت می‌کنید.</p>
    </form>
  </div></section>);}

function Footer(){return (<footer className="lk-foot"><div className="lk-wrap"><b dir="ltr">Grin Web</b><small>© ۱۴۰۵ گرین وب · همه‌ی حقوق محفوظ است.</small></div></footer>);}

function App(){
  const [p,setP]=React.useState(null);
  return (<>
    <div className="lk-navwrap"><Navbar links={D.links} ctaLabel={D.cta} /></div>
    <main><Hero/><Work onOpen={setP}/><Services/><Process/><Results/><Quote/><Clients/><Contact/></main>
    <Footer/>
    <Modal open={!!p} onClose={()=>setP(null)} title={p?.title} tags={p?.tags||[]} art={p?.art} sample challenge={p?.challenge} solution={p?.solution} outcome={p?.outcome} primaryLabel={D.cta} onPrimary={()=>{setP(null);location.hash="contact";}} />
  </>);
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);