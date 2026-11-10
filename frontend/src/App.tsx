import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flame,
  Leaf,
  LogIn,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  Phone,
  Users,
  UtensilsCrossed,
  X,
  Wine,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LoginDialog from "@/components/LoginDialog";
import Dashboard from "@/components/Dashboard";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

/* ----------------------------- Content ----------------------------- */

const RESTAURANT = {
  name: "NOOMA",
  subtitle: "Kitchen + Bar",
  address: "20th Lacson St., Brgy. 4, Bacolod City",
  phone: "(034) 123 4567",
  hours: "11:00 AM – 12:00 MN (Kitchen closes at 10:00 PM)",
};

const features = [
  {
    icon: Leaf,
    title: "Fresh & Local",
    text: "Locally sourced Bacolod produce, fresh seafood from Guimaras Strait, and prime cuts delivered daily.",
  },
  {
    icon: Flame,
    title: "Open Flame Grill",
    text: "Charcoal-fired artisan steaks and skewers cooked to order with deep, smoky flavor profiles.",
  },
  {
    icon: Wine,
    title: "Craft Bar & Cocktails",
    text: "Handcrafted tropical infusions, local craft beers on tap, and curated wine pairings for every dish.",
  },
];

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    title: "Main Dining Area & Bar",
    subtitle: "Warm, sophisticated interior designed for memorable dinners.",
  },
  {
    src: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    title: "Charcoal-Grilled Ribeye",
    subtitle: "Prime beef cuts grilled over local hardwood charcoal.",
  },
  {
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    title: "Craft Cocktails & Spirits",
    subtitle: "Handcrafted infusions and classic favorites served daily.",
  },
  {
    src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    title: "Evening Dining Ambiance",
    subtitle: "The perfect atmosphere for late-night food and drinks.",
  },
];

const menu = [
  {
    name: "NOOMA Signature Angus Ribeye",
    desc: "300g charcoal-grilled prime ribeye, truffle butter, roasted garlic mash",
    price: "₱1,450",
    category: "Mains",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Pan-Seared Salmon Fillet",
    desc: "Miso-glazed Atlantic salmon, ginger lemongrass risotto, asparagus",
    price: "₱780",
    category: "Mains",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Truffle Mushroom Pasta",
    desc: "Handmade fettuccine, local spicy chorizo bits, wild mushrooms, parmesan cream",
    price: "₱480",
    category: "Pasta",
    image:
      "https://images.unsplash.com/photo-1621996346565-e3d5d6281276?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Tablea Molten Lava Cake",
    desc: "Bacolod artisan dark chocolate cake, vanilla bean gelato, salted caramel",
    price: "₱290",
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
  },
];

const timeSlots = [
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#gallery", label: "Atmosphere" },
  { href: "#menu", label: "Kitchen & Bar" },
  { href: "#reserve", label: "Reservations" },
  { href: "#contact", label: "Find Us" },
];

/* ------------------------------ Types ------------------------------ */

type FormData = {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormData | "submit", string>>;

const initialForm: FormData = {
  name: "",
  phone: "",
  date: "",
  time: "",
  guests: "2",
  notes: "",
};

function localToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

/* ----------------------------- Reveal ------------------------------ */

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Page ------------------------------- */

export default function LandingPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const [user, setUser] = useState<string | null>(() =>
    window.localStorage.getItem("reservation-user"),
  );
  const [userRole, setUserRole] = useState<string | null>(() =>
    window.localStorage.getItem("reservation-role"),
  );

  const today = localToday();
  const solid = scrolled || menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (user) window.localStorage.setItem("reservation-user", user);
    else window.localStorage.removeItem("reservation-user");
  }, [user]);

  useEffect(() => {
    if (userRole) window.localStorage.setItem("reservation-role", userRole);
    else window.localStorage.removeItem("reservation-role");
  }, [userRole]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    const onResize = () => window.innerWidth >= 768 && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % galleryImages.length);
  };

  const prevSlide = () => {
    setActiveSlide(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  function handleLoginSuccess(email: string, role: string) {
    setUser(email);
    setUserRole(role);
    setForm((form) =>
      form.name ? form : { ...form, name: email.split("@")[0] },
    );
  }

  function handleLogout() {
    setUser(null);
    setUserRole(null);
    void fetch(apiUrl("Login/Logout.php"), { method: "POST" }).catch(
      (error: unknown) => {
        console.error("Failed to end login session", error);
      },
    );
  }

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[0-9+\-\s()]{7,}$/.test(form.phone))
      e.phone = "Enter a valid phone number";
    if (!form.date) e.date = "Pick a date";
    else if (form.date < today) e.date = "Pick today or a later date";
    if (!form.time) e.time = "Pick a time slot";
    return e;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("Reservations/create_reservation.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.name,
          customer_phone: form.phone,
          party_size: parseInt(form.guests),
          start_at: `${form.date} ${form.time}:00`,
          occasion: form.notes,
          source: "Landing Page",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Could not save your reservation");
      }

      setSubmitted(true);
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : "Something went wrong. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
  }

  if (user) {
    return (
      <Dashboard
        userEmail={user}
        userRole={userRole ?? ""}
        onLogout={handleLogout}
      />
    );
  }

  const selectClass =
    "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  const ghostOnHero = !solid && "text-white hover:bg-white/10 hover:text-white";

  return (
    <div className="bg-background text-foreground w-full overflow-x-hidden">
      {/* ------------------------- Navbar ------------------------- */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          solid
            ? "bg-background/90 border-b shadow-sm backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="flex h-16 w-full items-center justify-between px-6 lg:px-12">
          <a
            href="#top"
            className={cn(
              "font-display flex items-center gap-2 text-2xl font-semibold tracking-wider transition-colors",
              solid ? "text-foreground" : "text-white",
            )}
          >
            <Sparkles className="size-5 text-amber-500" />
            {RESTAURANT.name}
            <span className="text-xs font-normal tracking-normal opacity-75 hidden sm:inline">
              | {RESTAURANT.subtitle}
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={cn(
                  "transition-colors font-medium",
                  solid
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-white/80 hover:text-white",
                )}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLoginOpen(true)}
              className={cn("hidden md:inline-flex", ghostOnHero)}
            >
              <LogIn className="size-4" />
              Staff Login
            </Button>

            <a
              href="#reserve"
              className={cn(
                buttonVariants({ size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Book a Table
            </a>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className={cn(
                "rounded-md p-2 transition-colors md:hidden",
                solid
                  ? "text-foreground hover:bg-accent"
                  : "text-white hover:bg-white/10",
              )}
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <MenuIcon className="size-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            "grid overflow-hidden transition-all duration-300 md:hidden",
            menuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 bg-background/95 backdrop-blur-md border-b">
            <nav className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-foreground hover:bg-accent rounded-md px-3 py-3 text-base font-medium transition-colors"
                >
                  {l.label}
                </a>
              ))}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setLoginOpen(true);
                }}
                className="text-foreground hover:bg-accent flex items-center gap-2 rounded-md px-3 py-3 text-left text-base transition-colors"
              >
                <LogIn className="size-4" />
                Staff Login
              </button>

              <a
                href="#reserve"
                onClick={() => setMenuOpen(false)}
                className={cn(buttonVariants({ size: "lg" }), "mt-2 w-full")}
              >
                Book a Table
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* -------------------------- Hero -------------------------- */}
      <section
        id="top"
        className="relative flex min-h-svh snap-start items-center justify-center bg-neutral-900 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.78)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2400&q=80')",
        }}
      >
        <div className="mx-auto max-w-4xl px-6 text-center text-white">
          <Reveal>
            <span className="inline-block mb-4 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-widest">
              Now Open on Lacson Street
            </span>
            <h1 className="font-display text-5xl leading-[1.05] font-bold tracking-tight sm:text-7xl lg:text-8xl">
              NOOMA Kitchen + Bar
            </h1>
          </Reveal>
          <Reveal delay={150}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/85 sm:text-xl font-light">
              Elevated comfort food, charcoal-grilled specialties, and
              handcrafted cocktails in the heart of Bacolod City.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="#reserve" className={buttonVariants({ size: "lg" })}>
                Reserve a Table
              </a>
              <a
                href="#menu"
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
                )}
              >
                Explore Menu
              </a>
            </div>
          </Reveal>
        </div>

        <a
          href="#about"
          aria-label="Scroll to About"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 transition-colors hover:text-white"
        >
          <ChevronDown className="size-8 animate-bounce motion-reduce:animate-none" />
        </a>
      </section>

      {/* ------------------------- About -------------------------- */}
      <section
        id="about"
        className="flex min-h-svh snap-start items-center bg-neutral-50 dark:bg-neutral-900/50"
      >
        <div className="w-full px-6 py-24 lg:px-12">
          <Reveal className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              The NOOMA Experience
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Where exceptional ingredients meet warm Negrense hospitality.
              Designed for lively gatherings and memorable late nights.
            </p>
          </Reveal>
          <Reveal className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 120}>
                <Card className="h-full border-neutral-200 dark:border-neutral-800 shadow-xs">
                  <CardHeader>
                    <div className="bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-xl">
                      <Icon className="size-6" />
                    </div>
                    <CardTitle className="font-display text-2xl">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground leading-relaxed">
                    {text}
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ----------------------- Carousel Gallery ----------------------- */}
      <section
        id="gallery"
        className="py-24 bg-neutral-900 text-white border-y border-neutral-800"
      >
        <div className="w-full px-6 lg:px-12 max-w-7xl mx-auto space-y-8">
          <Reveal className="text-center">
            <span className="text-amber-400 font-semibold text-xs tracking-widest uppercase">
              Atmosphere & Culinary Crafts
            </span>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl mt-2">
              Experience NOOMA
            </h2>
            <p className="text-neutral-400 mt-2 text-base max-w-xl mx-auto">
              A glimpse at our lounge, charcoal-grilled mains, and craft
              cocktails on 20th Lacson St.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="relative overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl max-w-5xl mx-auto">
              <div className="relative h-[350px] sm:h-[480px] w-full overflow-hidden">
                <img
                  src={galleryImages[activeSlide].src}
                  alt={galleryImages[activeSlide].title}
                  className="h-full w-full object-cover transition-all duration-700 ease-in-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                  <h3 className="font-display text-2xl font-bold">
                    {galleryImages[activeSlide].title}
                  </h3>
                  <p className="text-sm text-neutral-300">
                    {galleryImages[activeSlide].subtitle}
                  </p>
                </div>
              </div>

              {/* Navigation Controls */}
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs border border-white/10 hover:bg-black/80 transition-colors"
                aria-label="Previous Image"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs border border-white/10 hover:bg-black/80 transition-colors"
                aria-label="Next Image"
              >
                <ChevronRight className="size-6" />
              </button>

              {/* Slide Indicators */}
              <div className="absolute bottom-4 right-6 flex items-center gap-2">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      activeSlide === idx
                        ? "w-6 bg-amber-400"
                        : "w-1.5 bg-white/40",
                    )}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------- Menu -------------------------- */}
      <section
        id="menu"
        className="flex min-h-svh snap-start items-center border-y bg-background"
      >
        <div className="w-full px-6 py-24 lg:px-12 max-w-7xl mx-auto">
          <Reveal className="mb-16 text-center">
            <span className="text-primary font-semibold text-xs tracking-widest uppercase">
              Our Offerings
            </span>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl mt-2">
              Kitchen & Bar Highlights
            </h2>
            <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
              Hand-crafted selections prepared fresh daily by our culinary team.
            </p>
          </Reveal>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {menu.map((item, i) => (
              <Reveal key={item.name} delay={i * 100}>
                <Card className="overflow-hidden border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="h-48 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="text-base font-bold text-primary">
                        {item.price}
                      </span>
                    </div>
                    <CardTitle className="font-display text-lg mt-2 leading-snug">
                      {item.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 text-muted-foreground text-xs leading-relaxed mt-auto">
                    {item.desc}
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------- Reservation ----------------------- */}
      <section
        id="reserve"
        className="flex min-h-svh snap-start items-center bg-neutral-50 dark:bg-neutral-900/50"
      >
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-20 lg:px-12">
          <Reveal>
            <span className="text-primary font-semibold text-xs tracking-widest uppercase">
              Table Bookings
            </span>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl mt-2">
              Secure your spot at NOOMA
            </h2>
            <p className="text-muted-foreground mt-4 max-w-md text-base sm:text-lg">
              Book online instantly. For private events or large parties above
              10 guests, please contact our front desk directly.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Clock, text: `Open daily: ${RESTAURANT.hours}` },
                {
                  icon: Users,
                  text: "Tables are held for up to 15 minutes past booking time",
                },
                { icon: MapPin, text: RESTAURANT.address },
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150}>
            <Card className="shadow-xl border-neutral-200 dark:border-neutral-800">
              <CardContent className="pt-6">
                {submitted ? (
                  <div
                    role="status"
                    className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-3 py-12 text-center duration-500"
                  >
                    <CheckCircle2 className="size-14 text-emerald-600" />
                    <h3 className="font-display text-2xl font-bold">
                      Reservation Confirmed!
                    </h3>
                    <p className="text-muted-foreground max-w-sm text-sm">
                      Thank you,{" "}
                      <strong className="text-foreground">{form.name}</strong>.
                      We have reserved a table for{" "}
                      <strong className="text-foreground">
                        {form.guests} guests
                      </strong>{" "}
                      on{" "}
                      <strong className="text-foreground">{form.date}</strong>{" "}
                      at{" "}
                      <strong className="text-foreground">{form.time}</strong>.
                      See you at NOOMA!
                    </p>
                    <Button variant="outline" onClick={reset} className="mt-4">
                      Make Another Booking
                    </Button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    noValidate
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Juan Dela Cruz"
                        aria-invalid={!!errors.name}
                      />
                      {errors.name && (
                        <p className="text-destructive text-xs">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="0912 345 6789"
                        aria-invalid={!!errors.phone}
                      />
                      {errors.phone && (
                        <p className="text-destructive text-xs">
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          min={today}
                          value={form.date}
                          onChange={(e) => update("date", e.target.value)}
                          aria-invalid={!!errors.date}
                        />
                        {errors.date && (
                          <p className="text-destructive text-xs">
                            {errors.date}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="time">Time Slot</Label>
                        <select
                          id="time"
                          className={selectClass}
                          value={form.time}
                          onChange={(e) => update("time", e.target.value)}
                          aria-invalid={!!errors.time}
                        >
                          <option value="">Select time</option>
                          {timeSlots.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        {errors.time && (
                          <p className="text-destructive text-xs">
                            {errors.time}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="guests">Number of Guests</Label>
                      <select
                        id="guests"
                        className={selectClass}
                        value={form.guests}
                        onChange={(e) => update("guests", e.target.value)}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "Guest" : "Guests"}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes">
                        Special Requests / Occasion (Optional)
                      </Label>
                      <Textarea
                        id="notes"
                        value={form.notes}
                        onChange={(e) => update("notes", e.target.value)}
                        placeholder="Birthday celebration, dietary restrictions, indoor/outdoor seating preference..."
                        className="resize-none h-20"
                      />
                    </div>

                    {errors.submit && (
                      <p
                        role="alert"
                        className="text-destructive text-sm font-medium"
                      >
                        {errors.submit}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full transition-transform active:scale-[0.98]"
                      size="lg"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Processing Booking..."
                        : "Confirm Reservation"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ------------------------- Footer ------------------------- */}
      <footer id="contact" className="snap-end border-t bg-background">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3 lg:px-12">
          <div>
            <div className="font-display flex items-center gap-2 text-2xl font-bold tracking-wider">
              <Sparkles className="size-5 text-amber-500" />
              {RESTAURANT.name}
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {RESTAURANT.subtitle} — Good food, exceptional drinks, and
              unforgettable evenings on Lacson Street.
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <MapPin className="text-primary size-4 shrink-0" />
              <span>{RESTAURANT.address}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="text-primary size-4 shrink-0" />
              <a
                href={`tel:${RESTAURANT.phone.replace(/[^\d+]/g, "")}`}
                className="hover:underline text-foreground font-medium"
              >
                {RESTAURANT.phone}
              </a>
            </div>
          </div>
          <div className="text-muted-foreground text-sm space-y-1">
            <p className="font-semibold text-foreground">Operating Hours</p>
            <p>{RESTAURANT.hours}</p>
          </div>
        </div>
        <div className="text-muted-foreground border-t py-5 text-center text-xs">
          © {new Date().getFullYear()} {RESTAURANT.name} {RESTAURANT.subtitle}.
          All rights reserved.
        </div>
      </footer>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
