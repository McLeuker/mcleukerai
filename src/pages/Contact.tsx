import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/layout/Footer";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { Mail, MessageSquare, Send, CheckCircle2, Sparkles } from "lucide-react";
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
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
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
      title: "Email Us",
      description: "For general inquiries and support",
      action: "contact@mcleukerai.com",
      href: "mailto:contact@mcleukerai.com"
    },
    {
      icon: MessageSquare,
      title: "Enterprise Sales",
      description: "For custom solutions and enterprise plans",
      action: "enterprise@mcleukerai.com",
      href: "mailto:enterprise@mcleukerai.com"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavigation showSectorTabs={false} showCredits={false} />

      {/* Hero Section */}
      <main className="pt-24 pb-16 flex-1">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-8">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                Get In Touch
              </span>
            </div>
            
            <h1 className="font-editorial text-4xl md:text-5xl lg:text-6xl text-foreground mb-6 text-balance leading-[1.1]">
              Contact Us
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Have questions about McLeuker AI? We'd love to hear from you. 
              Send us a message and we'll respond within 24 hours.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-5 gap-12">
              {/* Contact Form */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-xl border border-border shadow-premium p-8">
                  {isSubmitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-foreground" />
                      </div>
                      <h3 className="text-xl font-medium text-foreground mb-2">
                        Message Sent!
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for reaching out. We'll get back to you soon.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsSubmitted(false);
                          setFormData({ name: "", email: "", company: "", message: "" });
                        }}
                      >
                        Send another message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Your name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="company">Company (optional)</Label>
                        <Input
                          id="company"
                          name="company"
                          placeholder="Your company name"
                          value={formData.company}
                          onChange={handleChange}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Tell us how we can help..."
                          rows={5}
                          value={formData.message}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
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
                    className="block p-6 rounded-xl bg-card border border-border shadow-premium hover:shadow-elevated transition-shadow group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                      <option.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {option.description}
                    </p>
                    <span className="text-sm font-medium text-foreground group-hover:underline">
                      {option.action}
                    </span>
                  </a>
                ))}

                <div className="p-6 rounded-xl bg-secondary/50 border border-border">
                  <h3 className="text-base font-medium text-foreground mb-2">
                    Quick Response
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We typically respond to all inquiries within 24 hours during business days. 
                    For urgent matters, please email our support team directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
