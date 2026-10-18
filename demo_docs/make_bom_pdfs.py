"""Generate the 3 demo project BOM PDFs from supplier_risk_dataset.csv (needs google-chrome)."""
import csv, random, subprocess, pathlib, html, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT/'demo_docs'; TMP = pathlib.Path(tempfile.mkdtemp())
sup = {r['supplierID']: r['Supplier Name'] for r in csv.DictReader(open(ROOT/'poc'/'data'/'supplier_risk_dataset.csv'))}
rng = random.Random(42); ids = sorted(sup)

P = [
 dict(file='PROJECT_01_EMU_Fleet_Midlife_Overhaul_BOM.pdf', code='PRJ-2027-RS-014',
  title='Regional EMU Fleet Mid-Life Overhaul (18 trainsets)', owner='Rolling Stock Engineering', start='Q1 2027', end='Q4 2028', budget=14_500_000,
  desc='Mid-life overhaul of 18 four-car regional electric multiple units (72 cars, 144 bogies) after 15 years in service. '
       'Scope covers complete running-gear refurbishment, brake system renewal, passenger door replacement and HVAC upgrade to low-GWP refrigerant. '
       'Each trainset is out of service for 10 weeks; a maximum of 3 units may be in the workshop at any time to protect timetable availability.',
  goals=['Extend fleet service life by 15 years','Reduce brake-related failures by 40%','Meet PRM TSI accessibility requirements','Comply with EU F-gas regulation (R134a phase-out)'],
  hero='SUPP_09733', items=[
  ('Bogie frame, welded, motor bogie','EN 15085-2 CL1','pc',36),('Bogie frame, welded, trailer bogie','EN 15085-2 CL1','pc',108),
  ('Monobloc wheel Ø920 mm, ER7','EN 13262','pc',576),('Axlebox bearing unit TBU 130','EN 12082','pc',576),
  ('Brake caliper unit, pneumatic, with parking brake','EN 15827','pc',288),('Axle-mounted brake disc Ø640 mm','EN 14535-1','pc',576),
  ('Sintered brake pad set','UIC 541-3','set',1152),('Brake control unit (EP) incl. wheel-slide protection','EN 15734','pc',72),
  ('Secondary air spring with emergency rubber','EN 13597','pc',288),('Yaw damper, hydraulic','EN 13802','pc',288),
  ('Electric plug-sliding passenger door, 1300 mm','EN 14752','pc',288),('Saloon HVAC unit 34 kW, R513A','EN 14750-1','pc',72),
 ]),
 dict(file='PROJECT_02_ETCS_L2_Corridor_Upgrade_BOM.pdf', code='PRJ-2027-SIG-007',
  title='ETCS Level 2 Corridor Upgrade (142 km double track)', owner='Signalling & Control-Command', start='Q2 2027', end='Q2 2029', budget=38_000_000,
  desc='Migration of a 142 km mixed-traffic double-track corridor from national class-B signalling to ETCS Level 2 with GSM-R/FRMCS-ready radio. '
       'Includes two new electronic interlockings, one Radio Block Centre, trackside train detection renewal and on-board ETCS retrofit of 24 locomotives. '
       'Works are executed in night possessions; commissioning in three stages with fallback to legacy signalling until final cut-over.',
  goals=['Increase line capacity by 20%','Comply with EU ERTMS Deployment Plan (TEN-T core network)','Remove 310 lineside signals','Retrofit 24 locomotives with ETCS Baseline 3'],
  hero='SUPP_04968', items=[
  ('Radio Block Centre (RBC), redundant 2oo3','EN 50126/8/9 SIL4','pc',1),('Electronic interlocking, object controller cabinet','EN 50129 SIL4','pc',2),
  ('Eurobalise, fixed, with mounting kit','SUBSET-036','pc',1240),('Lineside Electronic Unit (LEU)','SUBSET-047','pc',60),
  ('Axle counter detection point','EN 50617-2','pc',420),('Point machine, electro-hydraulic','EN 50126','pc',96),
  ('GSM-R base transceiver station','EIRENE SRS','pc',38),('Fibre-optic cable 48F, armoured','IEC 60794','km',300),
  ('On-board ETCS kit (EVC, DMI, BTM antenna, odometry)','SUBSET-026 B3','set',24),('Signalling power supply, UPS 10 kVA','EN 50155','pc',64),
  ('Lineside equipment cabinet, outdoor IP55','EN 50125-3','pc',140),('Data cable 4×1.5 mm² signalling, LSZH','EN 50288','km',420),
 ]),
 dict(file='PROJECT_03_Depot_Electrification_Track_Renewal_BOM.pdf', code='PRJ-2027-INF-022',
  title='Maintenance Depot Electrification & Track Renewal', owner='Infrastructure & Facilities', start='Q3 2027', end='Q3 2028', budget=9_200_000,
  desc='Renewal of 11 km of depot track and 34 turnouts, plus electrification of 6 stabling sidings with 15 kV 16.7 Hz overhead contact line. '
       'A new pit road with under-floor wheel lathe and a 4-car battery-EMU charging point are added. '
       'The depot must remain operational during works; tracks are renewed one by one in 2-week blocks.',
  goals=['Allow overnight stabling of battery-electric fleet','Cut diesel shunting by 90%','Replace end-of-life 1970s turnouts','Reduce track maintenance cost by 25%'],
  hero='SUPP_09580', items=[
  ('Rail 60E1, R260, 18 m','EN 13674-1','t',1320),('Concrete sleeper B70 with fastenings','EN 13230','pc',18400),
  ('Turnout 60E1-300-1:9, complete','EN 13232','set',34),('Elastic rail fastening system','EN 13481','set',36800),
  ('Track ballast 31.5/50, granite','EN 13450','t',22000),('Thermite welding kit','EN 14730','kit',900),
  ('Contact wire AC-120 CuAg','EN 50149','km',14),('OCL mast, H-beam, galvanised','EN 50119','pc',210),
  ('Cantilever assembly, aluminium','EN 50119','set',210),('Section insulator 15 kV','EN 50119','pc',18),
  ('Under-floor wheel lathe, tandem','EN 13260','pc',1),('Battery-EMU charging station 1.5 MW','EN 50388','pc',1),
 ]),
]

CSS = """@page{size:A4;margin:12mm 13mm 12mm}
body{font-family:'DejaVu Sans',Arial,sans-serif;font-size:9pt;color:#1d2433;line-height:1.3}
.hd{display:flex;justify-content:space-between;border-bottom:3px solid #1f4e79;padding-bottom:8px}
.co{font-size:11pt;font-weight:700;color:#1f4e79;letter-spacing:.5px}.muted{color:#5b6475}
h1{font-size:15pt;margin:12px 0 2px}h2{font-size:11pt;color:#1f4e79;margin:10px 0 3px;border-bottom:1px solid #d6dbe4}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 24px;margin:8px 0}.grid div{display:flex}.grid b{flex:0 0 150px;color:#5b6475}
ul{margin:4px 0;padding-left:18px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th{background:#1f4e79;color:#fff;text-align:left;padding:5px 4px;font-size:8.3pt}
td{padding:3px 4px;border-bottom:1px solid #d6dbe4;font-size:8.3pt;vertical-align:top}
tr:nth-child(even) td{background:#f4f6fa}.r{text-align:right}.nw{white-space:nowrap}
.ft{margin-top:14px;padding:6px;border:1px dashed #b33;color:#b33;font-size:8pt;text-align:center}"""

for n,p in enumerate(P,1):
    picks = rng.sample([i for i in ids if i!=p['hero']], len(p['items']))
    picks[rng.randrange(3)] = p['hero']          # key supplier on a critical early item
    rows = ''.join(f"<tr><td>{i:02d}</td><td class=nw>{p['code'][-3:]}-{i:03d}</td><td>{html.escape(d)}</td><td>{s}</td>"
                   f"<td class='r nw'>{q:,} {u}</td><td class=nw>{sid}</td><td>{sup[sid]}</td></tr>"
                   for i,((d,s,u,q),sid) in enumerate(zip(p['items'],picks),1))
    doc = f"""<!doctype html><html><head><meta charset=utf-8><style>{CSS}</style></head><body>
<div class=hd><div class=co>RAIL OPERATOR · PROJECT PROCUREMENT</div><div class=muted style="text-align:right">Project code <b>{p['code']}</b><br>Document BOM-{n:02d} · Rev. A · 2026-10-18</div></div>
<h1>{p['title']}</h1>
<div class=grid><div><b>Project owner</b>{p['owner']}</div><div><b>Budget (CAPEX)</b>€ {p['budget']:,}</div>
<div><b>Planned start</b>{p['start']}</div><div><b>Planned completion</b>{p['end']}</div></div>
<h2>1. Project description</h2><p>{p['desc']}</p>
<h2>2. Objectives</h2><ul>{''.join(f'<li>{g}</li>' for g in p['goals'])}</ul>
<h2>3. Bill of materials</h2>
<table><tr><th>#</th><th>Item ID</th><th>Description</th><th>Standard</th><th class=r>Qty</th><th>Supplier ID</th><th>Supplier</th></tr>{rows}</table>
<h2>4. Procurement notes</h2><ul><li>Suppliers listed are the current preferred source per item; alternatives may be proposed after risk review.</li>
<li>All items require ISO/TS 22163 (IRIS) or equivalent certification and first article inspection before series delivery.</li>
<li>Supplier due diligence per LkSG / CSDDD is required before purchase order release.</li></ul>
<div class=ft>SIMULATED DEMO DOCUMENT – fictitious project for hackathon use. Supplier IDs and names refer to supplier_risk_dataset.csv.</div></body></html>"""
    h = TMP/f'bom{n}.html'; h.write_text(doc)
    subprocess.run(['google-chrome','--headless','--disable-gpu','--no-pdf-header-footer',f'--print-to-pdf={OUT/p["file"]}',h.as_uri()],check=True,capture_output=True)
    print(p['file'], ', '.join(picks))
