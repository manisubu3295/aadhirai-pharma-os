import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Paperclip, 
  Search, 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2 
} from "lucide-react";
import { useState } from "react";
import { inventoryData } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function NewSale() {
  const [items, setItems] = useState([
    { id: "1", name: "Atorvastatin", batch: "C45X39", expiry: "2024-04-20", qty: 1, price: 235.00, discount: 0, total: 235.00 }
  ]);

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const discount = 15.00;
  const tax = 25.65;
  const netAmount = subtotal - discount + tax;

  return (
    <AppLayout title="New Sale / Invoice">
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Left Side - Billing Form */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" className="h-9">New Bill</Button>
            <Button variant="outline" className="h-9">Save / Print</Button>
            <Button variant="outline" className="h-9">Hold Bill</Button>
            <Button variant="outline" className="h-9 text-destructive hover:text-destructive">Cancel</Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Customer Name</Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="relative flex-1">
                      <Paperclip className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground rotate-45" />
                      <Input placeholder="Prescription upload" className="pl-9 bg-muted/10 border-muted" />
                    </div>
                    <Button variant="outline" className="gap-2 text-muted-foreground font-normal">
                      <Paperclip className="h-4 w-4 rotate-45" /> Att file
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">Phone #</Label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search" className="pl-9 bg-muted/10 border-muted" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-medium">Doctor</Label>
                      <span className="text-sm text-primary font-medium cursor-pointer">Dr. Sekar</span>
                    </div>
                    <div className="relative mt-1.5">
                      <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center border rounded-md bg-muted/10 border-muted">
                        <div className="flex-1 px-9 py-2 text-sm">April</div>
                        <div className="px-3 py-2 text-sm border-l border-muted bg-white">2024</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medicine Table */}
              <div className="space-y-3 pt-2">
                <Label className="text-base font-medium">Add Medicine</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[30%]">Item</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="border-b-0">
                          <TableCell className="font-medium py-3">
                            {item.name}
                            <div className="h-1 w-24 bg-muted/30 rounded mt-2"></div>
                            <div className="h-1 w-16 bg-muted/30 rounded mt-1"></div>
                          </TableCell>
                          <TableCell className="py-3">
                            {item.batch}
                            <div className="h-1 w-16 bg-muted/30 rounded mt-2"></div>
                          </TableCell>
                          <TableCell className="py-3">
                            {item.expiry}
                            <div className="h-1 w-12 bg-muted/30 rounded mt-2"></div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-right pr-4 font-medium">5%</div>
                          </TableCell>
                          <TableCell className="text-right py-3 font-medium">
                            ₹{item.total.toFixed(2)}
                            <div className="h-1 w-12 bg-muted/30 rounded ml-auto mt-2"></div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Empty Rows for visual spacing */}
                      {[1, 2].map((i) => (
                        <TableRow key={i} className="border-b-0 hover:bg-transparent">
                          <TableCell><div className="h-2 w-32 bg-muted/20 rounded"></div></TableCell>
                          <TableCell><div className="h-2 w-20 bg-muted/20 rounded"></div></TableCell>
                          <TableCell><div className="h-2 w-24 bg-muted/20 rounded"></div></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-between items-center pt-2 px-2">
                  <span className="text-sm font-medium">Total</span>
                  <div className="flex gap-8 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold">₹285.00</span>
                  </div>
                </div>

                <Button variant="outline" className="mt-2 text-primary hover:text-primary hover:bg-primary/5 border-dashed">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>

              <div className="flex justify-end pt-4">
                <Button className="bg-primary hover:bg-primary/90 min-w-[150px]">
                  Generate Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Bill Summary */}
        <div className="w-full lg:w-[380px]">
          <Card className="border-0 shadow-sm h-full">
            <CardContent className="p-6 flex flex-col h-full">
              <h3 className="text-lg font-semibold mb-6">Bill Summary</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-dashed">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹295.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium">₹15.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (GST)</span>
                  <span className="font-medium">₹25.65</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <span className="font-semibold text-lg">Net Amount</span>
                <span className="font-bold text-2xl">₹310.65</span>
              </div>

              <div className="space-y-4 mb-8">
                <Label className="text-base font-medium">Payment Method</Label>
                <RadioGroup defaultValue="card" className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="font-normal cursor-pointer">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="font-normal cursor-pointer">UPI / QR</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="font-normal cursor-pointer">Card</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit" className="font-normal cursor-pointer">Credit Customer</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <Label className="font-medium">Received Amount</Label>
                  <div className="bg-muted/20 border rounded px-3 py-1.5 w-24 text-right font-mono text-sm">
                    ₹0
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-2">
                  <Checkbox id="print" />
                  <Label htmlFor="print" className="font-normal text-sm cursor-pointer">Print invoice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="email" />
                  <Label htmlFor="email" className="font-normal text-sm cursor-pointer">Send via Email or WhatsApp</Label>
                </div>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-base mt-auto">
                Generate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
