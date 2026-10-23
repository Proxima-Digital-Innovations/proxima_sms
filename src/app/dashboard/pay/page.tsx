'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  Building2, 
  QrCode, 
  Printer, 
  Copy, 
  Check,
  Landmark,
  ArrowRight
} from "lucide-react";
import Link from 'next/link';
import { 
  initializeOnlineFeePayment, 
  verifyOnlinePayment, 
  getPaymentReceiptDetails,
  getPaymentGatewayConfig,
  PaymentGatewayConfig 
} from '@/actions/payment-gateway-actions';

export default function GenericFeePaymentPage() {
  const { data: session } = useSession();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig | null>(null);

  // Payment Selection State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(50000);
  const [selectedGateway, setSelectedGateway] = useState<'PAYSTACK' | 'REMITA' | 'BANK_TRANSFER'>('PAYSTACK');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'SELECT_GATEWAY' | 'REMITA_RRR_DISPLAY' | 'BANK_TRANSFER_DISPLAY'>('SELECT_GATEWAY');
  const [paymentInitData, setPaymentInitData] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    // Simulated invoice fetch or connection to generic student invoices
    getPaymentGatewayConfig().then(cfg => setGatewayConfig(cfg));
    setIsLoading(false);
  }, []);

  const handleOpenPay = (inv: any) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.balance);
    setPaymentStep('SELECT_GATEWAY');
    setSelectedGateway('PAYSTACK');
    setIsPayOpen(true);
  };

  const handleProceedPayment = () => {
    startTransition(async () => {
      const payerEmail = session?.user?.email || 'parent@institution.edu.ng';
      const payerName = session?.user?.name || 'Parent / Student';

      const res = await initializeOnlineFeePayment({
        invoiceId: selectedInvoice?.id || 'inv-generic',
        amount: Number(payAmount),
        gateway: selectedGateway,
        payerEmail,
        payerName,
        invoiceType: 'SECONDARY',
      });

      if (!res.success || !res.data) {
        toast({ variant: 'destructive', title: 'Payment Error', description: res.error || 'Failed to initialize payment.' });
        return;
      }

      setPaymentInitData(res.data);

      if (selectedGateway === 'REMITA') {
        setPaymentStep('REMITA_RRR_DISPLAY');
      } else if (selectedGateway === 'BANK_TRANSFER') {
        setPaymentStep('BANK_TRANSFER_DISPLAY');
      } else {
        toast({
          title: 'Paystack Checkout Active',
          description: `Processing card settlement for ₦${Number(payAmount).toLocaleString()}.`,
        });

        setTimeout(async () => {
          const verifyRes = await verifyOnlinePayment({
            reference: res.data.reference,
            gateway: 'PAYSTACK',
          });

          if (verifyRes.success) {
            toast({
              title: 'Fee Payment Verified!',
              description: 'Transaction confirmed and official receipt issued.',
            });
            setIsPayOpen(false);
          }
        }, 1200);
      }
    });
  };

  const handleVerifyCompleted = (ref: string, gateway: string) => {
    startTransition(async () => {
      const res = await verifyOnlinePayment({ reference: ref, gateway });
      if (res.success) {
        toast({ title: 'Payment Confirmed', description: 'Settlement confirmed by Bursary.' });
        setIsPayOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Verification Failed', description: res.error });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({ title: 'Copied', description: 'RRR copied to clipboard.' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background p-5 sm:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <Wallet className="w-7 h-7 text-primary" />
              Online Fee Payment Portal
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
              Instant Settlement
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Secure electronic payments for tuition, departmental levies, hostel accommodation, and sundry charges.
          </p>
        </div>

        <Link href="/dashboard/tertiary/payments">
          <Button variant="outline" className="rounded-xl text-xs sm:text-sm h-10 border-border">
            Tertiary Invoices <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Quick Pay Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border bg-card p-5 space-y-3">
          <div className="p-3 bg-blue-500/10 rounded-xl w-fit text-blue-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Paystack Gateway</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pay instantly with Mastercard, Visa, Verve debit cards, USSD code (*737#, *919#), or mobile banking transfer.
          </p>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-5 space-y-3">
          <div className="p-3 bg-amber-500/10 rounded-xl w-fit text-amber-600">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Remita e-Collection</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generate an official 12-digit RRR for institutional TSA compliance. Pay directly online or at any commercial bank branch.
          </p>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-5 space-y-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl w-fit text-emerald-600">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Bursary Wire Transfer</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Direct bank transfer to the university revenue collection account with automatic reference tracking.
          </p>
        </Card>
      </div>

      {/* Fee Bill Simulator / Quick Payment Launcher */}
      <Card className="rounded-2xl border-border bg-card shadow-sm p-6">
        <div className="max-w-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Make an Ad-Hoc Fee Settlement</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Specify the payment amount or bill purpose to initiate checkout immediately.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Amount (₦)</Label>
            <Input 
              type="number" 
              value={payAmount} 
              onChange={e => setPayAmount(Number(e.target.value))} 
              className="font-mono font-bold text-base h-11"
            />
          </div>

          <div className="pt-2">
            <Button 
              onClick={() => handleOpenPay({ id: 'adhoc-invoice', balance: payAmount })}
              className="rounded-xl h-11 px-6 font-semibold shadow-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Launch Secure Payment Gateway
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment Gateway Modal */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md">
          {paymentStep === 'SELECT_GATEWAY' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Select Payment Channel
                </DialogTitle>
                <DialogDescription>
                  Choose how you want to pay ₦{Number(payAmount).toLocaleString()}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div
                  onClick={() => setSelectedGateway('PAYSTACK')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedGateway === 'PAYSTACK'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Paystack Online Checkout</p>
                      <p className="text-[11px] text-muted-foreground">Debit Cards, Bank Transfer, USSD</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Instant</Badge>
                </div>

                <div
                  onClick={() => setSelectedGateway('REMITA')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedGateway === 'REMITA'
                      ? 'border-amber-600 bg-amber-500/5 ring-1 ring-amber-600'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 font-bold text-xs">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Remita e-Collection (RRR)</p>
                      <p className="text-[11px] text-muted-foreground">Generate 12-digit RRR for Bank Branch or Online</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-amber-700">Official RRR</Badge>
                </div>

                <div
                  onClick={() => setSelectedGateway('BANK_TRANSFER')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedGateway === 'BANK_TRANSFER'
                      ? 'border-emerald-600 bg-emerald-500/5 ring-1 ring-emerald-600'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Direct University Bank Wire</p>
                      <p className="text-[11px] text-muted-foreground">Deposit to Institution Revenue Account</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Bursary Audit</Badge>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsPayOpen(false)}>Cancel</Button>
                <Button onClick={handleProceedPayment} disabled={isPending} className="font-semibold">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Proceed (₦{Number(payAmount).toLocaleString()})
                </Button>
              </DialogFooter>
            </>
          )}

          {paymentStep === 'REMITA_RRR_DISPLAY' && paymentInitData && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Remita Retrieval Reference (RRR)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pay with this code at any commercial bank branch or on Remita.net.
                </p>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Official Remita RRR
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-extrabold text-foreground tracking-widest">
                    {paymentInitData.rrrCode}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(paymentInitData.rrrCode)} className="h-8 w-8 p-0">
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="text-xs font-mono text-muted-foreground pt-1 border-t border-amber-500/20 flex justify-between">
                  <span>Amount: ₦{Number(paymentInitData.amount).toLocaleString()}</span>
                  <span>Ref: {paymentInitData.reference}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  onClick={() => handleVerifyCompleted(paymentInitData.rrrCode, 'REMITA')}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm Settlement & Clear Bill
                </Button>
                <Button variant="outline" onClick={() => setIsPayOpen(false)}>Close</Button>
              </div>
            </div>
          )}

          {paymentStep === 'BANK_TRANSFER_DISPLAY' && paymentInitData && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">University Collection Account</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Transfer with reference in narration.</p>
              </div>

              <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Bank Name</span>
                  <strong className="text-foreground">{paymentInitData.bankTransferDetails.bankName}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Account Number</span>
                  <strong className="text-foreground font-mono text-sm">{paymentInitData.bankTransferDetails.accountNumber}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Account Name</span>
                  <strong className="text-foreground text-right">{paymentInitData.bankTransferDetails.accountName}</strong>
                </div>
                <div className="flex justify-between py-1 bg-primary/5 p-2 rounded-lg">
                  <span className="font-bold text-primary">Narration Reference</span>
                  <strong className="font-mono text-primary font-bold">{paymentInitData.reference}</strong>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsPayOpen(false)}>Close</Button>
                <Button 
                  onClick={() => handleVerifyCompleted(paymentInitData.reference, 'BANK_TRANSFER')}
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  I Have Completed Transfer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
