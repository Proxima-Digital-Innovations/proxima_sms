import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Building2,
  CreditCard,
  User,
  GraduationCap,
  Receipt,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface VerifyReceiptPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function VerifyReceiptPage({ params }: VerifyReceiptPageProps) {
  const { id } = await params;

  const [receipt, profile] = await Promise.all([
    prisma.paymentReceipt.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            student: {
              include: {
                class: { select: { name: true } },
              },
            },
            term: { select: { name: true } },
          },
        },
        loggedBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    }),
    prisma.systemProfile.findFirst(),
  ]);

  if (!receipt) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-border p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Receipt Not Found</h1>
          <p className="text-sm text-muted-foreground">
            The receipt identifier <code className="font-mono font-bold text-foreground">{id}</code> could not be located in the institutional database.
          </p>
          <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground text-left space-y-1">
            <p className="font-semibold text-foreground">Security Notice:</p>
            <p>If you suspect this document has been altered or forged, please contact the school bursary immediately.</p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full">Return to School Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currencySymbol = profile?.currencySymbol || "₦";
  const schoolName = profile?.name || "Proxima SMS Academy";
  const schoolAddress = profile?.address || "Institution Campus";
  const schoolLogo = profile?.logoUrl;
  const isVerified = receipt.status === "VERIFIED";
  const isPending = receipt.status === "PENDING";
  const isReversed = receipt.status === "REVERSED";

  const student = receipt.invoice?.student;
  const studentName = student ? `${student.firstName} ${student.lastName}` : "Registered Student";
  const studentId = student?.studentId || "N/A";
  const className = student?.class?.name || "Assigned Class";
  const termName = receipt.invoice?.term?.name || "Academic Term";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 py-8">
      <div className="max-w-xl w-full space-y-4">
        {/* Status Verification Header Banner */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-sm flex items-center gap-3.5 ${
            isVerified
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : isPending
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isVerified
                ? "bg-emerald-600 text-white"
                : isPending
                ? "bg-amber-600 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {isVerified ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isPending ? (
              <Clock className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm uppercase tracking-wider">
                {isVerified
                  ? "Authentic Official Receipt"
                  : isPending
                  ? "Payment Pending Clearance"
                  : "Receipt Reversed / Revoked"}
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[10px] font-bold uppercase ${
                  isVerified
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : isPending
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {receipt.status}
              </Badge>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {isVerified
                ? "This payment is digitally certified and posted on the institutional general ledger."
                : isPending
                ? "This payment has been logged but is awaiting final banking clearance."
                : `This transaction was revoked: ${receipt.reversalReason || "Administrative reversal"}.`}
            </p>
          </div>
        </div>

        {/* Certificate Body Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-border overflow-hidden">
          {/* Institution Letterhead */}
          <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-12 h-12 object-contain rounded-lg" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-foreground leading-tight">{schoolName}</h2>
                <p className="text-xs text-muted-foreground">{schoolAddress}</p>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Proxima Verified Ledger System</span>
                </div>
              </div>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                Receipt Number
              </span>
              <span className="font-mono font-black text-foreground text-sm">
                {`RCP-${receipt.id.slice(-8).toUpperCase()}`}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {new Date(receipt.date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          {/* Amount Settled Highlight */}
          <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-border text-center">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest block mb-1">
              Amount Paid
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {currencySymbol}{receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {receipt.invoice && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Outstanding Balance: <span className="font-mono font-semibold text-foreground">{currencySymbol}{(receipt.invoice.balance ?? 0).toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <User className="w-3.5 h-3.5" /> Student / Candidate
                </div>
                <div className="font-bold text-foreground text-sm">{studentName}</div>
                <div className="font-mono text-muted-foreground text-[11px]">Admission No: {studentId}</div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <GraduationCap className="w-3.5 h-3.5" /> Class & Academic Cycle
                </div>
                <div className="font-bold text-foreground text-sm">{className}</div>
                <div className="text-muted-foreground text-[11px]">{termName}</div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <CreditCard className="w-3.5 h-3.5" /> Collection Channel
                </div>
                <div className="font-bold text-foreground text-sm">{receipt.method}</div>
                <div className="font-mono text-muted-foreground text-[11px]">
                  Ref: {receipt.reference || "DIRECT-BURSARY"}
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <Receipt className="w-3.5 h-3.5" /> Billing Description
                </div>
                <div className="font-bold text-foreground text-sm truncate">
                  {receipt.invoice?.description || "Tuition & School Levies"}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Cashier: {receipt.loggedBy ? `${receipt.loggedBy.firstName} ${receipt.loggedBy.lastName}` : "Bursar"}
                </div>
              </div>
            </div>

            {receipt.payerName && (
              <div className="p-3 bg-muted/30 rounded-xl border border-border text-[11px] flex justify-between">
                <span className="text-muted-foreground">Payer / Depositor Name:</span>
                <span className="font-bold text-foreground">{receipt.payerName}</span>
              </div>
            )}

            {isReversed && receipt.reversalReason && (
              <div className="p-3 bg-rose-500/10 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Official Reversal Record:
                </div>
                <p>{receipt.reversalReason}</p>
                {receipt.reversedAt && (
                  <p className="text-[10px] opacity-80">
                    Timestamp: {new Date(receipt.reversedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Audit validation note */}
            <div className="pt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified in institutional database • UID: {receipt.id}</span>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center text-xs text-muted-foreground px-1">
          <span>&copy; {new Date().getFullYear()} {schoolName}</span>
          <Link href="/login" className="hover:underline text-primary font-medium">
            Staff & Parent Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
