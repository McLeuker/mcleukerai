import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Mail, MessageSquare, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    inquiryType: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      inquiryType: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast({
      title: "Message sent successfully!",
      description: "We'll get back to you within 24 hours."
    });
  };

  const contactOptions = [
    {
      icon: Mail,
      title: "General Inquiries",
      description: "For questions about our platform and services",
      action: "info@mcleuker.com",
      href: "mailto:info@mcleuker.com"
    },
    {
      icon: MessageSquare,
      title: "Enterprise Solutions",
      description: "For custom solutions and dedicated support",
      action: "info@mcleuker.com",
      href: "mailto:info@mcleuker.com"
    }
  ];

  return (
    <div className="min-h-screen bg-[#070707] flex flex-col">
      <TopNavigation variant="marketing" showSectorTabs={false} showCredits={false} />
      
      {/* Spacer for fixed nav */}
      <div className="h-16 lg:h-[72px]" />

      <main>
        {/* Hero Section */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm text-white/50 uppercase tracking-[0.2em] mb-6">
                Get In Touch
              </p>
              
              <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl text-white/[0.92] mb-8 leading-[1.05]">
                Contact Us
              </h1>
              
              <p className="text-lg md:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed">
                Have questions about McLeuker AI? We'd love to hear from you. 
                Send us a message and we'll respond within 24 hours.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
                {/* Contact Form */}
                <div className="lg:col-span-3">
                  <div className={cn(
                    "p-8 lg:p-12 rounded-[20px]",
                    "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                    "border border-white/[0.10]",
                    "shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
                  )}>
                    {isSubmitted ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-8">
                          <CheckCircle2 className="w-10 h-10 text-white/70" />
                        </div>
                        <h3 className="text-2xl font-luxury text-white/[0.92] mb-4">
                          Message Sent
                        </h3>
                        <p className="text-white/60 mb-8 max-w-sm mx-auto">
                          Thank you for reaching out. Our team will get back to you shortly.
                        </p>
                        <Button 
                          variant="outline" 
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          onClick={() => {
                            setIsSubmitted(false);
                            setFormData({ name: "", email: "", company: "", inquiryType: "", message: "" });
                          }}
                        >
                          Send Another Message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="name" className="text-sm text-white/50 uppercase tracking-wide">
                              Name *
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="Your name"
                              value={formData.name}
                              onChange={handleChange}
                              className={cn(
                                "h-12 rounded-xl",
                                "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
                                "border border-white/[0.10]",
                                "text-white/[0.88] placeholder:text-white/40",
                                "focus:border-white/[0.18] focus:ring-white/[0.06]"
                              )}
                              required
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="email" className="text-sm text-white/50 uppercase tracking-wide">
                              Email *
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="you@company.com"
                              value={formData.email}
                              onChange={handleChange}
                              className={cn(
                                "h-12 rounded-xl",
                                "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
                                "border border-white/[0.10]",
                                "text-white/[0.88] placeholder:text-white/40",
                                "focus:border-white/[0.18] focus:ring-white/[0.06]"
                              )}
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="company" className="text-sm text-white/50 uppercase tracking-wide">
                              Company
                            </Label>
                            <Input
                              id="company"
                              name="company"
                              placeholder="Your company name"
                              value={formData.company}
                              onChange={handleChange}
                              className={cn(
                                "h-12 rounded-xl",
                                "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
                                "border border-white/[0.10]",
                                "text-white/[0.88] placeholder:text-white/40",
                                "focus:border-white/[0.18] focus:ring-white/[0.06]"
                              )}
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="inquiryType" className="text-sm text-white/50 uppercase tracking-wide">
                              Inquiry Type
                            </Label>
                            <Select value={formData.inquiryType} onValueChange={handleSelectChange}>
                              <SelectTrigger
                                className={cn(
                                  "h-12 rounded-xl",
                                  "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
                                  "border border-white/[0.10]",
                                  "text-white/[0.88]",
                                  "focus:border-white/[0.18] focus:ring-white/[0.06]",
                                  !formData.inquiryType && "text-white/40"
                                )}
                              >
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-white/10">
                                <SelectItem value="general" className="text-white/80 focus:bg-white/10 focus:text-white">General</SelectItem>
                                <SelectItem value="partnerships" className="text-white/80 focus:bg-white/10 focus:text-white">Partnerships</SelectItem>
                                <SelectItem value="support" className="text-white/80 focus:bg-white/10 focus:text-white">Support</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="message" className="text-sm text-white/50 uppercase tracking-wide">
                            Message *
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Tell us how we can help..."
                            rows={6}
                            value={formData.message}
                            onChange={handleChange}
                            className={cn(
                              "rounded-xl",
                              "bg-gradient-to-b from-[#1B1B1B] to-[#111111]",
                              "border border-white/[0.10]",
                              "text-white/[0.88] placeholder:text-white/40",
                              "focus:border-white/[0.18] focus:ring-white/[0.06]",
                              "resize-none"
                            )}
                            required
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full h-14 text-base bg-white text-black hover:bg-white/90" 
                          size="lg"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            "Sending..."
                          ) : (
                            <>
                              Send Message
                              <Send className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Contact Options */}
                <div className="lg:col-span-2 space-y-6">
                  {contactOptions.map((option, i) => (
                    <a
                      key={i}
                      href={option.href}
                      className={cn(
                        "block p-8 rounded-[20px]",
                        "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                        "border border-white/[0.10]",
                        "hover:border-white/[0.18] transition-all",
                        "group"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6 group-hover:bg-white/15 transition-colors">
                        <option.icon className="w-5 h-5 text-white/70" />
                      </div>
                      <h3 className="text-lg font-medium text-white/[0.92] mb-2">
                        {option.title}
                      </h3>
                      <p className="text-sm text-white/50 mb-4">
                        {option.description}
                      </p>
                      <span className="text-sm font-medium text-white/70 group-hover:text-white group-hover:underline transition-colors">
                        {option.action}
                      </span>
                    </a>
                  ))}

                  <div className={cn(
                    "p-8 rounded-[20px]",
                    "bg-gradient-to-b from-[#1A1A1A] to-[#141414]",
                    "border border-white/[0.10]"
                  )}>
                    <h3 className="text-lg font-medium text-white/[0.92] mb-3">
                      Quick Response
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      We typically respond to all inquiries within 24 hours during business days. 
                      For urgent matters, please email our support team directly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 lg:py-32 bg-[#0A0A0A]">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-luxury text-4xl md:text-5xl text-white/[0.92] mb-8 leading-[1.1]">
                Ready to explore?
              </h2>
              <p className="text-white/60 text-lg mb-12">
                Start your free trial today and experience AI-powered fashion intelligence.
              </p>
              <Button 
                size="lg" 
                className="px-10 py-6 text-base bg-white text-black hover:bg-white/90" 
                asChild
              >
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
