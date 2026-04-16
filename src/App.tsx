import React from 'react';
import { ChevronRight, ShieldCheck, Truck, Wrench, BadgeCheck, Phone, Send, Instagram, MapPin, Clock } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1D1D1F] font-sans flex flex-col items-center selection:bg-[#0066CC] selection:text-white">
      {/* Header */}
      <header className="w-full h-12 bg-[#FFFFFF] px-4 md:px-16 flex justify-between items-center max-w-[1024px] mx-auto z-10">
        <div className="font-semibold text-[19px] tracking-[-0.02em]">ProDuct</div>
        <div className="text-[12px] font-normal opacity-80">+998(88)414-88-88</div>
      </header>

      {/* Hero Section */}
      <section className="w-full pt-16 pb-16 flex flex-col items-center text-center px-6">
        <h1 className="text-[56px] md:text-[72px] font-semibold tracking-[-0.015em] mb-2 max-w-5xl leading-[1.05]">
          Professional Yondashuv
        </h1>
        <p className="text-[24px] text-[#86868B] font-normal mt-2">Official Apple & Pro Workstations.</p>
        <div className="flex flex-row gap-4 items-center justify-center mt-8">
          <a href="#apple" className="bg-[#0071E3] text-white text-[17px] font-normal px-6 py-2.5 rounded-full hover:bg-[#0077ED] transition-colors">
            Apple
          </a>
          <a href="#pc" className="bg-[#0071E3] text-white text-[17px] font-normal px-6 py-2.5 rounded-full hover:bg-[#0077ED] transition-colors">
            PC kompyuterlar
          </a>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#F5F5F7] rounded-[22px] p-6 flex flex-col items-center text-center gap-3">
            <BadgeCheck className="w-8 h-8 text-[#1D1D1F]" strokeWidth={1.5} />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">100% Rasmiy Mahsulotlar</h3>
          </div>
          <div className="bg-[#F5F5F7] rounded-[22px] p-6 flex flex-col items-center text-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#1D1D1F]" strokeWidth={1.5} />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Rasmiy Kafolat</h3>
          </div>
          <div className="bg-[#F5F5F7] rounded-[22px] p-6 flex flex-col items-center text-center gap-3">
            <Truck className="w-8 h-8 text-[#1D1D1F]" strokeWidth={1.5} />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Toshkent bo'ylab tezkor yetkazib berish</h3>
          </div>
          <div className="bg-[#F5F5F7] rounded-[22px] p-6 flex flex-col items-center text-center gap-3">
            <Wrench className="w-8 h-8 text-[#1D1D1F]" strokeWidth={1.5} />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Professional maslahat va yig'ib berish</h3>
          </div>
        </div>
      </section>

      {/* Main Showcase - Apple */}
      <section id="apple" className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-20 pt-10">
        <h2 className="text-[40px] font-semibold tracking-[-0.015em] text-center mb-10">Apple Ekosistemasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[400px] md:auto-rows-[450px]">
          
          {/* MacBook - Large */}
          <div className="md:col-span-8 bg-[#F5F5F7] rounded-[22px] overflow-hidden relative flex flex-col items-center text-center p-8 hover:scale-[1.01] transition-transform duration-500 cursor-pointer">
            <h3 className="text-[28px] font-semibold tracking-[-0.01em] mb-1">MacBook Pro</h3>
            <p className="text-[17px] text-[#86868B] font-normal">Aqlbovar qilmas kuch.</p>
            <div className="absolute bottom-0 w-full h-[65%] flex justify-center items-end">
              <img 
                src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80" 
                alt="Apple MacBook" 
                className="w-[85%] h-full object-cover object-top rounded-t-3xl" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          {/* iPhone - Medium */}
          <div className="md:col-span-4 bg-[#F5F5F7] rounded-[22px] overflow-hidden relative flex flex-col items-center text-center p-8 hover:scale-[1.01] transition-transform duration-500 cursor-pointer">
            <h3 className="text-[28px] font-semibold tracking-[-0.01em] mb-1">iPhone 15 Pro</h3>
            <p className="text-[17px] text-[#86868B] font-normal">Titanium.</p>
            <div className="absolute bottom-0 w-full h-[60%] flex justify-center items-end">
              <img 
                src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80" 
                alt="iPhone 15 Pro" 
                className="w-[70%] h-full object-cover object-top rounded-t-3xl" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          {/* iPad - Medium */}
          <div className="md:col-span-6 bg-[#F5F5F7] rounded-[22px] overflow-hidden relative flex flex-col items-center text-center p-8 hover:scale-[1.01] transition-transform duration-500 cursor-pointer">
            <h3 className="text-[28px] font-semibold tracking-[-0.01em] mb-1">iPad Pro</h3>
            <p className="text-[17px] text-[#86868B] font-normal">Yengil. Kuchli.</p>
            <div className="absolute bottom-0 w-full h-[60%] flex justify-center items-end">
              <img 
                src="https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80" 
                alt="iPad Pro" 
                className="w-[80%] h-full object-cover object-top rounded-t-3xl" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          {/* Accessories - Medium */}
          <div className="md:col-span-6 bg-[#F5F5F7] rounded-[22px] overflow-hidden relative flex flex-col items-center text-center p-8 hover:scale-[1.01] transition-transform duration-500 cursor-pointer">
            <h3 className="text-[28px] font-semibold tracking-[-0.01em] mb-1">Aksessuarlar</h3>
            <p className="text-[17px] text-[#86868B] font-normal">Sehrli ulanish.</p>
            <div className="absolute bottom-0 w-full h-[60%] flex justify-center items-end">
              <img 
                src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80" 
                alt="Apple Accessories" 
                className="w-[70%] h-full object-cover object-center rounded-t-3xl" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

        </div>
      </section>

      {/* Main Showcase - PC */}
      <section id="pc" className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-24 pt-10">
        <h2 className="text-[40px] font-semibold tracking-[-0.015em] text-center mb-10">Professional PC</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[400px] md:auto-rows-[450px]">
          
          {/* PC Card 1 - Medium */}
          <div className="md:col-span-4 bg-[#F5F5F7] rounded-[22px] overflow-hidden relative flex flex-col items-center text-center p-8 hover:scale-[1.01] transition-transform duration-500 cursor-pointer">
            <h3 className="text-[28px] font-semibold tracking-[-0.01em] mb-1">Pro Studio</h3>
            <p className="text-[17px] text-[#86868B] font-normal">Cheksiz imkoniyat.</p>
            <div className="absolute bottom-0 w-full h-[60%] flex justify-center items-end">
              <img 
                src="https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=600&q=80" 
                alt="Pro PC Setup" 
                className="w-[80%] h-full object-cover object-top rounded-t-3xl" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          {/* PC Card 2 - Large */}
          <div className="md:col-span-8 bg-[#F5F5F7] rounded-[22px] overflow-hidden relative flex flex-col items-center text-center p-8 hover:scale-[1.01] transition-transform duration-500 cursor-pointer">
            <h3 className="text-[28px] font-semibold tracking-[-0.01em] mb-1">Workstation</h3>
            <p className="text-[17px] text-[#86868B] font-normal">Arxitektor va 3D dizaynerlar uchun.</p>
            <div className="absolute bottom-0 w-full h-[65%] flex justify-center items-end">
              <img 
                src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1000&q=80" 
                alt="Clean Workstation" 
                className="w-[85%] h-full object-cover object-top rounded-t-3xl" 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

        </div>
      </section>

      {/* Target Audience */}
      <section className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-24 pt-10">
        <h2 className="text-[40px] font-semibold tracking-[-0.015em] text-center mb-10">Kimlar uchun?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#F5F5F7] rounded-[22px] overflow-hidden flex flex-col">
            <div className="h-[200px] w-full overflow-hidden">
              <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80" alt="Dasturchilar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-6 text-center">
              <h3 className="text-[19px] font-semibold tracking-[-0.01em] mb-1">Dasturchilar va IT</h3>
              <p className="text-[15px] text-[#86868B]">Kod yozish va murakkab hisoblashlar uchun ishonchli tizimlar.</p>
            </div>
          </div>
          <div className="bg-[#F5F5F7] rounded-[22px] overflow-hidden flex flex-col">
            <div className="h-[200px] w-full overflow-hidden">
              <img src="https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80" alt="Dizaynerlar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-6 text-center">
              <h3 className="text-[19px] font-semibold tracking-[-0.01em] mb-1">Dizayner va Kreatorlar</h3>
              <p className="text-[15px] text-[#86868B]">Aniq ranglar va yuqori render tezligi talab qiluvchilar uchun.</p>
            </div>
          </div>
          <div className="bg-[#F5F5F7] rounded-[22px] overflow-hidden flex flex-col">
            <div className="h-[200px] w-full overflow-hidden">
              <img src="https://images.unsplash.com/photo-1664575602276-acd073f104c1?auto=format&fit=crop&w=600&q=80" alt="Biznes" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="p-6 text-center">
              <h3 className="text-[19px] font-semibold tracking-[-0.01em] mb-1">Biznes va Menejment</h3>
              <p className="text-[15px] text-[#86868B]">Premium ko'rinish va barqaror ishlashni qadrlovchilar uchun.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-24">
        <div className="bg-[#F5F5F7] rounded-[22px] p-10 md:p-16 flex flex-col items-center text-center">
          <h2 className="text-[40px] md:text-[48px] font-semibold tracking-[-0.015em] mb-4 leading-[1.1]">Yordam kerakmi?</h2>
          <p className="text-[19px] text-[#86868B] mb-8 max-w-lg">
            O'zingizga mos qurilmani tanlashda yordam beramiz. Mutaxassislarimiz bilan bog'laning.
          </p>
          <div className="text-[32px] md:text-[48px] font-semibold tracking-[-0.015em] mb-8 text-[#1D1D1F]">
            +998(88)414-88-88
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <a href="tel:+998884148888" className="bg-[#1D1D1F] text-white text-[17px] font-normal px-8 py-3.5 rounded-full hover:bg-[#000000] transition-colors flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" /> Qo'ng'iroq qilish
            </a>
            <a href="#" className="bg-[#0071E3] text-white text-[17px] font-normal px-8 py-3.5 rounded-full hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2">
              <Send className="w-5 h-5" /> Telegramdan yozish
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#F5F5F7] pt-12 pb-10 px-4 md:px-16 flex flex-col mt-auto">
        <div className="max-w-[1024px] mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div className="flex flex-col gap-3">
            <div className="font-semibold text-[19px] tracking-[-0.02em] text-[#1D1D1F] mb-2">ProDuct</div>
            <p className="text-[12px] text-[#86868B] leading-relaxed max-w-[250px]">
              Official Apple va Professional PC kompyuterlari savdosi. Sifat va ishonch kafolati.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-semibold text-[#1D1D1F] uppercase tracking-wider mb-2">Aloqa</h4>
            <a href="tel:+998884148888" className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] flex items-center gap-2 transition-colors">
              <Phone className="w-4 h-4" /> +998(88)414-88-88
            </a>
            <a href="#" className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] flex items-center gap-2 transition-colors">
              <Send className="w-4 h-4" /> @product_uz
            </a>
            <a href="#" className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] flex items-center gap-2 transition-colors">
              <Instagram className="w-4 h-4" /> @product.uz
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-semibold text-[#1D1D1F] uppercase tracking-wider mb-2">Manzil</h4>
            <div className="text-[12px] text-[#86868B] flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>O'zbekiston, Toshkent shahar,<br/>Mirobod tumani</span>
            </div>
            <div className="text-[12px] text-[#86868B] flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4" />
              <span>Du-Yak: 10:00 - 20:00</span>
            </div>
          </div>
        </div>
        
        <div className="w-full h-[1px] bg-[#D2D2D7] mb-4 max-w-[1024px] mx-auto"></div>
        
        <div className="max-w-[1024px] mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[12px] text-[#86868B]">
          <p>&copy; 2026 ProDuct. Barcha huquqlar himoyalangan.</p>
          <div className="flex gap-6">
            <span className="hover:text-[#1D1D1F] transition-colors cursor-pointer">Maxfiylik siyosati</span>
            <span className="hover:text-[#1D1D1F] transition-colors cursor-pointer">Foydalanish shartlari</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
