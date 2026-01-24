import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Mail, MessageSquare, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
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
      action: "contact@mcleuker.com",
      href: "mailto:contact@mcleuker.com"
    },
    {
      icon: MessageSquare,
      title: "Enterprise Solutions",
      description: "For custom solutions and dedicated support",
      action: "contact@mcleuker.com",
      href: "mailto:contact@mcleuker.com"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavigation showSectorTabs={false} showCredits={false} />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-6">
                Get In Touch
              </p>
              
              <h1 className="font-luxury text-5xl md:text-6xl lg:text-7xl text-foreground mb-8 leading-[1.05]">
                Contact Us
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
                  <div className="bg-card rounded-lg border border-border p-8 lg:p-12 shadow-luxury">
                    {isSubmitted ? (
                      <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-8">
                          <CheckCircle2 className="w-10 h-10 text-foreground" />
                        </div>
                        <h3 className="text-2xl font-luxury text-foreground mb-4">
                          Message Sent
                        </h3>
                        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                          Thank you for reaching out. Our team will get back to you shortly.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsSubmitted(false);
                            setFormData({ name: "", email: "", company: "", message: "" });
                          }}
                        >
                          Send Another Message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label htmlFor="name" className="text-sm text-muted-foreground uppercase tracking-wide">
                              Name *
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              placeholder="Your name"
                              value={formData.name}
                              onChange={handleChange}
                              className="h-12 bg-background border-border"
                              required
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="email" className="text-sm text-muted-foreground uppercase tracking-wide">
                              Email *
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="you@company.com"
                              value={formData.email}
                              onChange={handleChange}
                              className="h-12 bg-background border-border"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="company" className="text-sm text-muted-foreground uppercase tracking-wide">
                            Company
                          </Label>
                          <Input
                            id="company"
                            name="company"
                            placeholder="Your company name"
                            value={formData.company}
                            onChange={handleChange}
                            className="h-12 bg-background border-border"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="message" className="text-sm text-muted-foreground uppercase tracking-wide">
                            Message *
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Tell us how we can help..."
                            rows={6}
                            value={formData.message}
                            onChange={handleChange}
                            className="bg-background border-border resize-none"
                            required
                          />
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full h-14 text-base" 
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
                      className="block p-8 rounded-lg bg-card border border-border shadow-premium hover-lift group"
                    >
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-6 group-hover:bg-accent transition-colors">
                        <option.icon className="w-5 h-5 text-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {option.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {option.description}
                      </p>
                      <span className="text-sm font-medium text-foreground group-hover:underline">
                        {option.action}
                      </span>
                    </a>
                  ))}

                  <div className="p-8 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="text-lg font-medium text-foreground mb-3">
                      Quick Response
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
        <section className="py-24 lg:py-32 bg-secondary/30">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-luxury text-4xl md:text-5xl text-foreground mb-8 leading-[1.1]">
                Ready to explore?
              </h2>
              <p className="text-muted-foreground text-lg mb-12">
                Start your free trial today and experience AI-powered fashion intelligence.
              </p>
              <Button size="lg" className="px-10 py-6 text-base" asChild>
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