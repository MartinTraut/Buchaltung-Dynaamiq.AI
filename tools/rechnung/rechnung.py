# -*- coding: utf-8 -*-
"""DYNAAMIQ AI — Rechnungs-Template (HTML → PDF, 1 Seite A4).

Aufruf:   python3 tools/rechnung/rechnung.py
Output:   ~/Desktop/Rechnung-<NR>.html + .pdf  und Archivkopie unter Ausgangsrechnungen/<JAHR>/
Rendering: headless Chrome (wird automatisch aufgerufen; Pfad unten in CHROME).

Für eine neue Rechnung NUR das INVOICE-Dict anpassen — Summen, USt, Fälligkeit,
Dateinamen, GiroCode und Prüfsummen werden daraus berechnet.
"""
import os, re, subprocess, shutil, base64, datetime, time

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(os.path.dirname(BASE))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# ============================================================
# RECHNUNGSDATEN — einzige Stelle, die je Rechnung angepasst wird
# ============================================================
INVOICE = {
    "number": "2026-432",
    "issue_date": datetime.date(2026, 8, 18),
    "service_note": "Leistungsdatum entspricht Rechnungsdatum",  # UStAE 14.5 Abs. 16
    "customer_no": "K-1005",
    "payment_days": 7,
    "recipient": {
        "company": "Skope Gebrauchtwarenhandel",
        "contact": "Thomas Zielke",
        "street": "Im Kampfrad 3",
        "city": "74196 Neuenstadt am Kocher",
    },
    "title": "Bewertungsstrecke",
    "title_accent": "Google-Unternehmensprofil",
    "lead": ("Eingerichtet und übergeben: zwei NFC-Aufsteller, die Kunden ohne "
             "Umweg zur Google-Bewertung führen — Smartphone auflegen genügt."),
    "items": [
        # Ohne "qty": Menge und Stückpreis stehen in Titel und Text, die Tabelle
        # bleibt zweispaltig und ruhig. Mit "qty"/"unit" blendet das Template
        # eigene Spalten für Menge und Einzelpreis ein — für Rechnungen, bei
        # denen die Stückzahl die Hauptaussage ist.
        {"title": "Bewertungsstrecke eingerichtet · 2 Aufsteller",
         "sub": ("NFC-Chips programmiert und mit dem Google-Unternehmensprofil des "
                 "Auftraggebers verknüpft, Bewertungsweg eingerichtet und vor Ort "
                 "übergeben. Tischaufsteller inklusive. 40,00 € netto je Aufsteller."),
         "net": 80.00},
    ],
    "discount": {"label": "Mengenrabatt (2 Stück)", "amount": 5.00},  # oder None
    "tax_rate": 0.19,
    "legal": ("<b>Leistungsumfang:</b> Einrichtung und persönliche Übergabe vor Ort; "
              "die verwendeten Aufsteller sind Teil der Leistung. Die hinterlegte "
              "Ziel-Adresse der NFC-Chips lässt sich jederzeit auf Wunsch ändern."),
    "short_name": "Bewertungsstrecke",
}

SELLER = {
    "name": "Martin Traut",
    "brand": "DYNAAMIQ AI",
    "street": "Graf-von-Düren-Straße 31",
    "city": "74196 Neuenstadt am Kocher",
    "email": "rechnung@dynaamiq.ai",
    "web": "dynaamiq.ai",
    "vat_id": "DE366566010",
    "iban": "DE78 1001 1001 2306 8288 39",
    "bank": "N26 Bank · BIC NTSBDEB1XXX",
}

# ============================================================
# Berechnungen — nichts hiervon wird von Hand gepflegt
# ============================================================
def eur(n):
    s = f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s + " €"

def d_de(d): return d.strftime("%d.%m.%Y")

subtotal = round(sum(i["net"] for i in INVOICE["items"]), 2)
discount = round(INVOICE["discount"]["amount"], 2) if INVOICE["discount"] else 0.0
net      = round(subtotal - discount, 2)
tax      = round(net * INVOICE["tax_rate"], 2)
gross    = round(net + tax, 2)
assert round(net + tax, 2) == gross
due_date = INVOICE["issue_date"] + datetime.timedelta(days=INVOICE["payment_days"])
NUM, ISSUE, DUE = INVOICE["number"], d_de(INVOICE["issue_date"]), d_de(due_date)
tax_pct = f"{INVOICE['tax_rate']*100:.0f}"

# Rechtszeile unter dem GiroCode. Software und Ware brauchen unterschiedliche
# Vorbehalte — deshalb je Rechnung setzbar, mit dem Software-Wortlaut als Vorgabe.
LEGAL = INVOICE.get("legal") or (
    "<b>Eigentums- und Rechtevorbehalt:</b> Gemäß Vereinbarung gehen alle Nutzungs- und "
    "Verwertungsrechte an Website und Software erst mit vollständiger Bezahlung auf den "
    "Auftraggeber über.")
LEGAL = (f"{INVOICE['service_note']}. Zahlbar ohne Abzug bis {DUE}. {LEGAL} "
         "Übermittlung als elektronische Rechnung (PDF) mit Zustimmung des Empfängers "
         "gemäß §27 Abs. 38 UStG.")

# ---- GiroCode (EPC-QR, SCT v002): Betrag + IBAN + Verwendungszweck als ein Scan
import segno
epc = "\n".join(["BCD", "002", "1", "SCT", "", SELLER["name"],
                 SELLER["iban"].replace(" ", ""), f"EUR{gross:.2f}",
                 "", "", f"Rechnung {NUM}", ""])
qr = segno.make(epc, error="m")
# border=4: die Ruhezone gehört in den Code, nicht ans Layout. Ohne sie steht
# die Bildunterschrift zu dicht am Muster und stört das Einlesen.
_svg = qr.svg_inline(scale=3, dark="#141d2b", border=4)
# viewBox nachrüsten: segno setzt nur width/height. Ein SVG ohne viewBox
# skaliert per CSS bloß sein Fenster, nicht seinen Inhalt — bei 66px Druckbreite
# blieben von 37 Modulen die linken 22 übrig. Der Code war beschnitten und
# damit für jede Banking-App unlesbar, sah aber wie ein gültiger QR aus.
_dim = re.search(r'<svg width="(\d+)" height="(\d+)"', _svg)
QR_SVG = _svg.replace("<svg ", f'<svg viewBox="0 0 {_dim.group(1)} {_dim.group(2)}" ', 1)

# ---- Assets
def read(p): return open(os.path.join(BASE, p)).read()
def b64(p): return base64.b64encode(open(os.path.join(BASE, p), "rb").read()).decode()
MARK, WORD = read("assets/dyn_mark.svg"), read("assets/dyn_wordmark.svg")
FONTS = (
    "@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;"
    f"src:url(data:font/woff2;base64,{b64('assets/inter.woff2')}) format('woff2');}}\n"
    "@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:300 700;"
    f"src:url(data:font/woff2;base64,{b64('assets/sgrotesk.woff2')}) format('woff2');}}"
)

# ============================================================
# Layout — Council-abgestimmt, bitte nur bewusst ändern
# ============================================================
CSS = FONTS + """
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --ink:#141d2b; --ink2:#39445a; --muted:#66718a; --line:#e4e8f0;
  --navy1:#070c1c; --navy2:#101a38; --green:#0a8f5b;
  --grad:linear-gradient(90deg,#00ffe6,#1f7bf2,#3d00ff);
  --gradtext:linear-gradient(90deg,#0d94a8,#2f39e8);
  --accent:#1b64d8;
  --caps-ls:.15em;
}
html,body{background:#e9ecf2;font-family:'Inter',-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
  color:var(--ink);-webkit-font-smoothing:antialiased;}
/* Tabellenziffern NUR auf Zahlen — global macht Inters tnum auch Bindestriche ziffernbreit */
td.amt,.tv,.grand-val,.spec .sv,.kv .v{font-variant-numeric:tabular-nums;}
.disp{font-family:'Space Grotesk','Inter',sans-serif;}
.caps{font-size:10px;letter-spacing:var(--caps-ls);text-transform:uppercase;color:var(--muted);font-weight:700;}
.gtext{color:var(--accent);}
.toolbar{max-width:820px;margin:22px auto 0;display:flex;justify-content:space-between;align-items:center;
  padding:0 4px;font-size:13px;color:#555;}
.toolbar button{border:0;border-radius:9px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;
  color:#fff;background:var(--gradtext);}
.sheet{max-width:820px;margin:14px auto 60px;background:#fff;border-radius:14px;overflow:hidden;
  box-shadow:0 24px 60px rgba(7,12,28,.18);
  /* Volle Blatthöhe (820px Breite : A4-Verhältnis) und Spaltenfluss — nur so
     kann die Fußzeile unten am Blatt stehen statt im Weiß zu schweben. */
  min-height:1160px;display:flex;flex-direction:column;}
.body{flex:1;display:flex;flex-direction:column;}

/* ---------- Kopf ---------- */
.head{position:relative;background:linear-gradient(120deg,var(--navy1) 30%,var(--navy2));
  padding:30px 42px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden;}
.head::before{content:"";position:absolute;inset:0;
  background:
    radial-gradient(ellipse 420px 200px at 88% -10%, rgba(0,255,230,.16), transparent 65%),
    radial-gradient(ellipse 380px 220px at 8% 120%, rgba(61,0,255,.22), transparent 65%);}
.head::after{content:"";position:absolute;inset:0;opacity:.5;
  background:
    repeating-linear-gradient(90deg, rgba(255,255,255,.028) 0 1px, transparent 1px 46px),
    repeating-linear-gradient(0deg, rgba(255,255,255,.022) 0 1px, transparent 1px 46px);}
.head-in{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;padding-bottom:26px;}
.brand{display:flex;align-items:center;gap:16px;}
.mark{width:58px;height:58px;filter:saturate(1.15) drop-shadow(0 4px 18px rgba(0,255,230,.45));}
.wordmark{height:26px;display:block;}
/* Schriftzug weiss auf dem dunklen Kopf. Der Markenverlauf sitzt bereits in
   der Bildmarke daneben und in der Linie darunter — im Namen selbst kostet er
   nur Kontrast, im Schwarz-Weiss-Druck sogar Lesbarkeit. */
.wordmark stop{stop-color:#ffffff;}
.wordmark *{fill:#ffffff;}
.brand-sub{margin-top:6px;font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:#dde5f8;}
.doc{text-align:right;}
.doc .eyebrow{font-size:10.5px;letter-spacing:.3em;text-transform:uppercase;color:#7ee7db;font-weight:700;}
.doc .dnum{font-size:25px;font-weight:700;color:#fff;letter-spacing:.04em;margin-top:4px;}
.doc .dline{margin-top:7px;margin-left:auto;width:120px;height:2px;border-radius:2px;background:var(--grad);
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.head .rule{position:relative;z-index:1;height:3px;margin:0 -42px;background:var(--grad);
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}

/* ---------- Spec-Leiste ---------- */
.specs{display:flex;background:#f6f8fc;border-bottom:1px solid var(--line);
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.spec{flex:1;padding:13px 20px 12px;border-left:1px solid var(--line);}
.spec:first-child{border-left:0;padding-left:42px;}
.spec:last-child{padding-right:42px;}
.spec .sv{margin-top:4px;font-size:13.5px;font-weight:700;}
.spec.hot .sv{color:var(--accent);}

/* ---------- Körper ---------- */
.body{padding:26px 42px 24px;}
.senderline{font-size:10px;color:#8b95aa;}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;margin-top:14px;
  padding-bottom:20px;border-bottom:1px solid var(--line);}
.eyebrow{margin-bottom:7px;}
.rname{font-size:17px;font-weight:800;letter-spacing:-.01em;}
.raddr{margin-top:3px;font-size:13.5px;line-height:1.55;color:var(--ink2);}
.issuer{text-align:right;font-size:13.5px;line-height:1.55;color:var(--ink2);}
.issuer .rname{font-size:14px;}

.title{margin-top:22px;}
.title h1{font-size:23px;font-weight:700;letter-spacing:-.01em;}
.lead{margin-top:6px;font-size:13.5px;color:var(--ink2);line-height:1.55;max-width:620px;}

/* ---------- Positionen ---------- */
table.items{width:100%;border-collapse:collapse;margin-top:20px;}
table.items th{font-size:10px;letter-spacing:var(--caps-ls);text-transform:uppercase;color:var(--muted);
  font-weight:700;text-align:left;padding:0 10px 9px;border-bottom:2px solid var(--ink);}
table.items th:first-child,table.items td.pos{padding-left:0;}
table.items th.amt,table.items td.amt{text-align:right;white-space:nowrap;padding-right:0;}
table.items td{padding:14px 10px;border-bottom:1px solid var(--line);vertical-align:top;}
td.pos{width:36px;}
td.pos i{font-style:normal;font-size:12.5px;font-weight:700;color:#1f7bf2;}
.d-title{display:block;font-size:14px;font-weight:700;}
.d-sub{display:block;margin-top:4px;font-size:12.5px;line-height:1.55;color:var(--muted);max-width:640px;}
td.amt{font-size:14px;font-weight:700;}
/* Menge und Einzelpreis: rechtsbündig wie der Betrag, aber leiser — der
   Gesamtbetrag bleibt die einzige fette Zahl in der Zeile. */
th.qty,td.qty{text-align:right;white-space:nowrap;}
td.qty{font-size:12.5px;font-weight:600;color:var(--ink2);font-variant-numeric:tabular-nums;}

/* ---------- Zahlung + Summe ---------- */
.bottom{display:flex;gap:28px;margin-top:24px;align-items:stretch;}
.pay{flex:1;position:relative;border:1px solid var(--line);border-radius:12px;padding:16px 20px 14px;
  background:#fbfcfe;-webkit-print-color-adjust:exact;print-color-adjust:exact;overflow:hidden;}
.pay::before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--grad);}
.pay h3{margin-bottom:9px;}
.kv{display:flex;justify-content:space-between;gap:14px;font-size:12.5px;padding:4.5px 0;}
.kv .k{color:var(--muted);}
.kv .v{font-weight:700;text-align:right;white-space:nowrap;}
.kv.hot .v{color:var(--accent);}
.tot{width:300px;display:flex;flex-direction:column;justify-content:flex-end;}
.trow{display:flex;justify-content:space-between;font-size:13.5px;padding:7px 0;border-bottom:1px solid var(--line);}
.trow .tv{font-weight:700;}
.trow.disc .tv{color:var(--green);}
.grand{margin-top:14px;position:relative;background:linear-gradient(120deg,var(--navy1),var(--navy2));
  border-radius:12px;padding:16px 20px 15px;overflow:hidden;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
.grand::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:var(--grad);}
.grand::after{content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse 240px 120px at 100% 0%, rgba(0,255,230,.14), transparent 70%);}
.grand-in{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:baseline;gap:14px;}
.grand-lab{font-size:11px;letter-spacing:var(--caps-ls);text-transform:uppercase;color:#e6ecfb;
  font-weight:700;line-height:1.5;}
.grand-lab em{font-style:normal;color:#b9c4e4;font-size:10px;letter-spacing:.1em;display:block;}
.grand-val{font-size:28px;font-weight:700;color:#fff;white-space:nowrap;}

/* ---------- Dank, GiroCode + Rechtliches, Fuß ---------- */
.thanks{margin-top:18px;font-size:12.5px;font-weight:600;color:var(--ink2);}
.legalrow{display:flex;gap:18px;align-items:center;margin-top:10px;
  border-top:1px solid var(--line);padding-top:12px;}
.qrbox{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none;}
.qrbox svg{width:112px;height:112px;}
.qrbox .ql{font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
  font-weight:700;text-align:center;line-height:1.4;}
.legal{flex:1;font-size:11px;line-height:1.6;color:var(--muted);}
.legal b{color:var(--ink2);}
/* Fußzeile: drei Spalten statt einer gedrängten Zeile. Anbieter, Kontakt und
   Steuer-/Bankdaten stehen getrennt, damit jede Angabe einzeln auffindbar ist —
   die Bankverbindung bekommt so eine zweite Fundstelle neben dem Zahlungsblock. */
.foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--line);
  display:flex;gap:34px;align-items:flex-start;}
.foot-col{flex:1;min-width:0;}
.foot-col .caps{margin-bottom:6px;font-size:8.5px;}
.foot-col .fl{font-size:11.5px;line-height:1.65;color:var(--ink2);}
.foot-col .fl b{font-weight:700;color:var(--ink);}
.foot-col .fl .dim{color:var(--muted);}
.foot-brand{flex:0 0 auto;display:flex;align-items:center;gap:10px;}
.foot-brand .fmark{width:30px;height:30px;opacity:.9;}

@page{size:A4;margin:10mm;}
@media print{
  html,body{background:#fff;}
  .toolbar{display:none;}
  .sheet{max-width:none;margin:0;border-radius:0;box-shadow:none;}
  .head{padding:17px 38px 0;}
  .head-in{padding-bottom:13px;}
  .mark{width:50px;height:50px;}
  .spec{padding-top:9px;padding-bottom:8px;}
  .spec:first-child{padding-left:38px;} .spec:last-child{padding-right:38px;}
  .body{padding:14px 38px 10px;}
  .top{margin-top:9px;padding-bottom:11px;}
  .title{margin-top:10px;}
  .title h1{font-size:22px;}
  .lead{margin-top:4px;}
  table.items{margin-top:10px;}
  table.items thead{display:table-header-group;}
  table.items tr{break-inside:avoid;page-break-inside:avoid;}
  table.items td{padding:10px 10px;}
  .bottom{margin-top:11px;}
  .kv{padding:3.5px 0;}
  .trow{padding:5.5px 0;}
  .grand{margin-top:11px;padding:12px 20px 11px;}
  .grand-val{font-size:26px;}
  .thanks{margin-top:9px;}
  .legalrow{margin-top:6px;padding-top:8px;}
  .qrbox svg{width:100px;height:100px;}
  .qrbox .ql{font-size:8px;}
  .foot{padding-top:10px;}
  /* Satzspiegel = A4 minus @page-Rand (2 × 10 mm). Reicht der Inhalt nicht bis
     unten, schiebt margin-top:auto die Fußzeile an die Kante; ist er länger,
     gewinnt der Inhalt und min-height bleibt wirkungslos — kein Umbruchrisiko. */
  .sheet{min-height:277mm;}
  .grand,.legalrow,.foot,.bottom,.thanks{break-inside:avoid;page-break-inside:avoid;}
}
"""

# ============================================================
# HTML
# ============================================================
R = INVOICE["recipient"]
# Menge und Einzelpreis nur, wenn mindestens eine Position sie führt — bei
# reinen Pauschalen wären zwei leere Spalten nur Rauschen.
has_qty = any(it.get("qty") for it in INVOICE["items"])
head_qty = '<th class="qty">Menge</th><th class="qty">Einzelpreis</th>' if has_qty else ""

items_html = ""
for n, it in enumerate(INVOICE["items"], 1):
    qty_cells = ""
    if has_qty:
        if it.get("qty"):
            menge = f'{it["qty"]:g} {it.get("unit", "")}'.strip()
            einzel = eur(it["net"] / it["qty"])
        else:
            menge, einzel = "—", ""
        qty_cells = f'<td class="qty">{menge}</td><td class="qty">{einzel}</td>'
    items_html += (f'<tr><td class="pos"><i class="disp">{n:02d}</i></td><td>'
                   f'<span class="d-title">{it["title"]}</span>'
                   f'<span class="d-sub">{it["sub"]}</span></td>'
                   f'{qty_cells}'
                   f'<td class="amt">{eur(it["net"])}</td></tr>')

tot_html = ""
if INVOICE["discount"]:
    tot_html += (f'<div class="trow"><span>Zwischensumme (netto)</span><span class="tv">{eur(subtotal)}</span></div>'
                 f'<div class="trow disc"><span>{INVOICE["discount"]["label"]}</span>'
                 f'<span class="tv">&minus;{eur(discount)}</span></div>')
tot_html += (f'<div class="trow"><span>Netto gesamt</span><span class="tv">{eur(net)}</span></div>'
             f'<div class="trow"><span>zzgl. {tax_pct}&nbsp;% USt</span><span class="tv">{eur(tax)}</span></div>')

html = f"""<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rechnung {NUM} · {SELLER["brand"]}</title>
<style>{CSS}</style></head><body>
<div class="toolbar"><span>{SELLER["brand"]} · Rechnung {NUM}</span>
<button onclick="window.print()">Als PDF speichern</button></div>
<div class="sheet">

  <div class="head">
    <div class="head-in">
      <div class="brand">{MARK}<div>{WORD}<div class="brand-sub">Webdesign &amp; KI-Automatisierung</div></div></div>
      <div class="doc"><div class="eyebrow">Rechnung</div><div class="dnum disp">{NUM}</div><div class="dline"></div></div>
    </div>
    <div class="rule"></div>
  </div>

  <div class="specs">
    <div class="spec"><div class="caps">Rechnungsdatum</div><div class="sv">{ISSUE}</div></div>
    <div class="spec"><div class="caps">Leistungsdatum</div><div class="sv">{ISSUE}</div></div>
    <div class="spec"><div class="caps">Kunden-Nr.</div><div class="sv">{INVOICE["customer_no"]}</div></div>
    <div class="spec hot"><div class="caps">Zahlbar bis</div><div class="sv">{DUE}</div></div>
  </div>

  <div class="body">
    <div class="senderline">{SELLER["name"]} · {SELLER["street"]} · {SELLER["city"]}</div>

    <div class="top">
      <div class="recip"><div class="caps eyebrow">Rechnung an</div>
        <div class="rname">{R["company"]}</div>
        <div class="raddr">{R["contact"]}<br>{R["street"]}<br>{R["city"]}</div></div>
      <div class="issuer"><div class="caps eyebrow" style="text-align:right;">Rechnungssteller</div>
        <div class="rname">{SELLER["brand"]} · {SELLER["name"]}</div>
        <div class="raddr">{SELLER["street"]}<br>{SELLER["city"]}<br>USt-IdNr. {SELLER["vat_id"]}</div></div>
    </div>

    <div class="title"><h1 class="disp">{INVOICE["title"]} — <span class="gtext">{INVOICE["title_accent"]}</span></h1>
    <p class="lead">{INVOICE["lead"]}</p></div>

    <table class="items"><thead><tr>
      <th>Pos.</th><th>Leistung</th>{head_qty}<th class="amt">Betrag (netto)</th>
    </tr></thead><tbody>{items_html}</tbody></table>

    <div class="bottom">
      <div class="pay"><h3 class="caps">Zahlung</h3>
        <div class="kv hot"><span class="k">Betrag</span><span class="v">{eur(gross)}</span></div>
        <div class="kv"><span class="k">IBAN</span><span class="v">{SELLER["iban"]}</span></div>
        <div class="kv"><span class="k">Bank</span><span class="v">{SELLER["bank"]}</span></div>
        <div class="kv"><span class="k">Kontoinhaber</span><span class="v">{SELLER["name"]}</span></div>
        <div class="kv"><span class="k">Verwendungszweck</span><span class="v">Rechnung {NUM}</span></div>
        <div class="kv hot"><span class="k">Fällig bis</span><span class="v">{DUE}</span></div>
      </div>
      <div class="tot">
        {tot_html}
        <div class="grand"><div class="grand-in">
          <div class="grand-lab">Gesamtbetrag<em>inkl. {tax_pct}&nbsp;% USt</em></div>
          <div class="grand-val disp">{eur(gross)}</div>
        </div></div>
      </div>
    </div>

    <div class="thanks">Vielen Dank für die gute Zusammenarbeit.</div>
    <div class="legalrow">
      <div class="qrbox">{QR_SVG}<div class="ql">GiroCode — mit<br>Banking-App scannen</div></div>
      <div class="legal">{LEGAL}</div>
    </div>

    <div class="foot">
      <div class="foot-col">
        <div class="caps">Anbieter</div>
        <div class="fl"><b>{SELLER["brand"]}</b><br>{SELLER["name"]}<br>
          <span class="dim">{SELLER["street"]}<br>{SELLER["city"]}</span></div>
      </div>
      <div class="foot-col">
        <div class="caps">Kontakt</div>
        <div class="fl">{SELLER["email"]}<br>{SELLER["web"]}</div>
      </div>
      <div class="foot-col">
        <div class="caps">Steuer &amp; Bankverbindung</div>
        <div class="fl">USt-IdNr. {SELLER["vat_id"]}<br>
          <span class="dim">{SELLER["iban"]}<br>{SELLER["bank"]}</span></div>
      </div>
    </div>
  </div>
</div></body></html>
"""

# ============================================================
# Schreiben, Prüfen, Rendern, Archivieren
# ============================================================
year = INVOICE["issue_date"].year
fname = f"Rechnung-{NUM}-{INVOICE['short_name']}"
desktop = os.path.expanduser("~/Desktop")
html_path = os.path.join(desktop, fname + ".html")
pdf_path = os.path.join(desktop, fname + ".pdf")
archive_dir = os.path.join(PROJECT, "Ausgangsrechnungen", str(year))
public_dir = os.path.join(PROJECT, "public", "rechnungen")

open(html_path, "w").write(html)

checks = [eur(net), eur(tax), eur(gross), eur(subtotal), NUM, DUE,
          SELLER["iban"], SELLER["vat_id"]] + [eur(i["net"]) for i in INVOICE["items"]]
missing = [c for c in checks if c.replace(" €", "") not in html]
print(f"{fname}.html  {len(html)} bytes  Checks: {len(checks)-len(missing)}/{len(checks)} ok"
      + (f"  FEHLT: {missing}" if missing else ""))
if len(INVOICE["items"]) > 4:
    print("WARNUNG: >4 Positionen — PDF auf Seitenumbruch prüfen!")

if os.path.exists(CHROME):
    # Alte Ausgabe zuerst weg: die Warteschleife unten prüft nur, ob eine Datei
    # mit brauchbarer Größe existiert. Bleibt die PDF des letzten Laufs liegen,
    # ist die Bedingung sofort erfüllt und der alte Stand wird archiviert und
    # veröffentlicht — die Änderung am Template landet nirgends.
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    profile = f"/tmp/chrome-rechnung-{int(time.time())}"
    p = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                          "--no-margins", f"--user-data-dir={profile}",
                          f"--print-to-pdf={pdf_path}", f"file://{html_path}"],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(30):
        time.sleep(0.5)
        if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 10000:
            time.sleep(1.5); break
    p.kill()
    subprocess.run(["pkill", "-f", profile], capture_output=True)
    shutil.rmtree(profile, ignore_errors=True)
    if os.path.exists(pdf_path):
        pages = len(re.findall(rb"/Type\s*/Page[^s]", open(pdf_path, "rb").read()))
        print(f"{fname}.pdf  {os.path.getsize(pdf_path)//1024} KB  Seiten: {pages}"
              + ("" if pages == 1 else "  WARNUNG: mehr als 1 Seite!"))
        os.makedirs(archive_dir, exist_ok=True)
        shutil.copy2(pdf_path, os.path.join(archive_dir, fname + ".pdf"))
        print(f"Archiviert: Ausgangsrechnungen/{year}/{fname}.pdf")
        # Zweite Ablage: aus public/ liefert die App die Original-PDF hinter
        # „Original-PDF öffnen" aus. Ohne diese Kopie zeigt das Dashboard nach
        # jeder Template-Änderung weiter den alten Stand — genau so ist einmal
        # eine überholte Fußzeile im Browser stehen geblieben.
        os.makedirs(public_dir, exist_ok=True)
        shutil.copy2(pdf_path, os.path.join(public_dir, fname + ".pdf"))
        print(f"Veröffentlicht: public/rechnungen/{fname}.pdf")
else:
    print("Chrome nicht gefunden — HTML im Browser öffnen und mit ⌘P als PDF speichern.")
