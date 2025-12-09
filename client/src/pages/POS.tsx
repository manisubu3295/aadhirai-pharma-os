import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function POS() {
  const [cart, setCart] = useState<{id: number, name: string, price: string, quantity: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines"],
    queryFn: async () => {
      const response = await fetch("/api/medicines");
      if (!response.ok) throw new Error("Failed to fetch medicines");
      return response.json();
    },
  });

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const subtotal = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const filteredItems = medicines.filter((item: any) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(item.id).includes(searchTerm)
  );

  return (
    <AppLayout title="Point of Sale">
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        
        <div className="col-span-8 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none bg-transparent">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-10 h-10 bg-card border-none shadow-sm" 
                  placeholder="Scan barcode or search products..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <Button variant="secondary" className="h-10">Categories</Button>
            </div>

            <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
              {filteredItems.map((item: any) => (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  className={cn(
                    "bg-card p-4 rounded-lg shadow-sm border border-border/50 cursor-pointer hover:border-primary transition-all active:scale-95",
                    item.status === "Out of Stock" && "opacity-50 pointer-events-none grayscale"
                  )}
                >
                  <div className="h-20 bg-muted/30 rounded-md mb-3 flex items-center justify-center text-muted-foreground">
                    <span className="text-2xl font-bold opacity-20">Rx</span>
                  </div>
                  <h3 className="font-medium text-sm truncate" title={item.name}>{item.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{item.category}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">₹{parseFloat(item.price).toFixed(2)}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full border",
                      item.status === "In Stock" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      item.status === "Low Stock" ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {item.quantity} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-4 flex flex-col h-full">
          <Card className="flex-1 flex flex-col shadow-lg border-l border-t-0 border-r-0 border-b-0 rounded-none -mr-6 -my-6 h-[calc(100%+3rem)]">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Current Order</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCart([])}>
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 bg-muted/50 p-2 rounded-md">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Walk-in Customer</span>
                <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-primary">Change</Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                  <p>Cart is empty</p>
                  <p className="text-sm opacity-60">Scan items or select from list</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {cart.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-muted/20">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <div className="text-xs text-muted-foreground mt-1">₹{parseFloat(item.price).toFixed(2)} / unit</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-background border rounded-md h-8">
                          <button 
                            className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button 
                            className="w-8 h-full flex items-center justify-center hover:bg-muted transition-colors"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="w-16 text-right font-medium text-sm">
                          ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            <div className="border-t bg-muted/10 p-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (8%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="w-full flex flex-col h-14 gap-1 py-2">
                  <Banknote className="h-4 w-4" />
                  <span className="text-xs">Cash</span>
                </Button>
                <Button className="w-full flex flex-col h-14 gap-1 py-2" disabled={cart.length === 0}>
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs">Card / Digital</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
