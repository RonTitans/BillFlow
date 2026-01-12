import os
import pandas as pd
import openpyxl
from datetime import datetime, date

VAT_RATE = 0.18  # 18%

def fmt_dmy(val) -> str:
    """Convert date value to dd/mm/yyyy string."""
    if isinstance(val, (pd.Timestamp, datetime, date)):
        return val.strftime("%d/%m/%Y")
    s = str(val).strip()
    for f in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, f).strftime("%d/%m/%Y")
        except ValueError:
            continue
    return s

def transform_final_corrected(src_path: str, dst_path: str):
    """
    FINAL CORRECTED VERSION: 
    - Use Energy cost by TOU tariff fields for consumption
    - Use CSV Total discount (ILS) field instead of calculating discounts manually
    """
    
    ext = os.path.splitext(src_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(src_path)
    else:
        df = pd.read_excel(src_path)
    
    # Handle comma-formatted numbers (like "1,778.33") in CSV files
    numeric_columns = ['Peak consumption', 'Off-peak consumption', 'Transformer unit', 
                      'Consumption with discount peak', 'Consumption with discount off-peak',
                      'Consumption without discount peak', 'Consumption without discount off-peak',
                      'Cost with discount peak', 'Cost with discount off-peak',
                      'Energy cost peak by TOU tariff', 'Energy cost off-peak by TOU tariff',
                      'Total discount peak (ILS)', 'Total discount off-peak (ILS)',
                      'Total discount (ILS)', 'Total cost', 'Total cost VAT',
                      'Total cost without discount', 'Distribution', 'Supply', 'KVA cost',
                      'Power factor fine', 'Various charges', 'Various credits']
    
    for col in numeric_columns:
        if col in df.columns and df[col].dtype == 'object':
            # Remove commas and convert to float
            df[col] = df[col].astype(str).str.replace(',', '').astype(float)

    # Tariff mappings 
    tariff_map = {
        "Residential": [
            ("P-3008", "מגורים - עם הנחה פסגה"),
            ("P-3009", "מגורים - עם הנחה שפל"),
            ("P-0005", "חלוקה"), ("P-0001", "אספקה"), ("P-0011", "עלות החיבור"),
        ],
        "TOU LV": [
            ("P-2008", "תעוז מתח נמוך - עם הנחה פסגה"),
            ("P-2009", "תעוז מתח נמוך - עם הנחה שפל"),
            ("P-0005", "חלוקה"), ("P-0001", "אספקה"), ("P-0011", "עלות החיבור"),
        ],
        "Streetlight": [
            ("P-4008", "מאור רחוב - עם הנחה פסגה"),
            ("P-4009", "מאור רחוב - עם הנחה שפל"),
            ("P-0005", "חלוקה"), ("P-0001", "אספקה"), ("P-0011", "עלות החיבור"),
        ],
        "TOU MV": [
            ("P-1008", "תעוז מתח גבוה - עם הנחה פסגה"),
            ("P-1009", "תעוז מתח גבוה - עם הנחה שפל"),
            ("P-0005", "חלוקה"), ("P-0001", "אספקה"), ("P-0011", "עלות החיבור"),
        ],
    }

    # GROSS CHARGES - for display only
    gross_map = {
        "TOU LV":      (("P-5004","סה\"כ חיוב גולמי תעוז מתח נמוך פסגה"),
                        ("P-5005","סה\"כ חיוב גולמי תעוז מתח נמוך שפל")),
        "TOU MV":      (("P-5008","סה\"כ חיוב גולמי תעוז מתח גבוה פסגה"),
                        ("P-5009","סה\"כ חיוב גולמי תעוז מתח גבוה שפל")),
        "Residential": (("P-5038","סה\"כ חיוב גולמי מגורים פסגה"),
                        ("P-5039","סה\"כ חיוב גולמי מגורים שפל")),
        "Streetlight": (("P-5048","סה\"כ חיוב גולמי מאור רחוב פסגה"),
                        ("P-5049","סה\"כ חיוב גולמי מאור רחוב שפל")),
    }

    out = []

    for _, row in df.iterrows():
        tid = row["Tariff ID"]
        items = tariff_map.get(tid, [])
        if not items:
            continue

        start_date = fmt_dmy(row["From"])
        end_date = fmt_dmy(row["To"])

        # 1. GROSS CHARGES - FOR DISPLAY ONLY (כלול בחיוב = "לא")
        if tid in gross_map:
            for code, desc in gross_map[tid]:
                peak = "פסגה" in desc
                qty = row["Peak consumption"] if peak else row["Off-peak consumption"]
                price_orig = row["TOU tariff peak"] if peak else row["TOU tariff off-peak"]
                total = qty * price_orig / 100
                vat = total * VAT_RATE
                out.append({
                    "מזהה פריט": code, "תיאור": desc,
                    "מש\"ב": "פסגה" if peak else "שפל",
                    "כמות": qty, "יחידת מידה": "kWh" if qty else "",
                    "מחיר יחידה": price_orig,
                    "סכום ": total,
                    "סכום המע\"מ": vat,
                    "סכום כולל מע\"מ": total + vat,
                    "כלול בחיוב": "לא",  # DISPLAY ONLY
                    "מספר חשבונית": row["Document number"],
                    "חשבון לקוח משלם": 10003,
                    "שם הלקוח המשלם": "עיריית ראשון לציון",
                    "שם משתמש עיקרי": row["Site name"],
                    "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                    "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                    "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                    "תאריך התחלה": start_date,
                    "תאריך הסיום": end_date,
                })

        # 2. DISCOUNT ITEMS - Calculate from gross vs net costs
        # P-6001 - הנחה פסגה (calculated as gross - net)
        gross_peak = float(row.get("Energy cost peak by TOU tariff", 0))
        net_peak = float(row.get("Cost with discount peak", 0))
        discount_peak = gross_peak - net_peak
        if discount_peak > 0:
            qty = row["Peak consumption"]
            discount_amount = -discount_peak  # Make negative
            unit_price = (discount_amount * 100) / qty if qty > 0 else 0  # convert to agorot
            vat = discount_amount * VAT_RATE
            out.append({
                "מזהה פריט": "P-6001",
                "תיאור": "הנחה פסגה",
                "מש\"ב": "פסגה",
                "כמות": qty,
                "יחידת מידה": "kWh",
                "מחיר יחידה": unit_price,
                "סכום ": discount_amount,
                "סכום המע\"מ": vat,
                "סכום כולל מע\"מ": discount_amount + vat,
                "כלול בחיוב": "לא",  # DISPLAY ONLY - discount for transparency
                "מספר חשבונית": row["Document number"],
                "חשבון לקוח משלם": 10003,
                "שם הלקוח המשלם": "עיריית ראשון לציון",
                "שם משתמש עיקרי": row["Site name"],
                "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                "תאריך התחלה": start_date,
                "תאריך הסיום": end_date,
            })

        # P-6002 - הנחה שפל (calculated as gross - net)
        gross_offpeak = float(row.get("Energy cost off-peak by TOU tariff", 0))
        net_offpeak = float(row.get("Cost with discount off-peak", 0))
        discount_offpeak = gross_offpeak - net_offpeak
        if discount_offpeak > 0:
            qty = row["Off-peak consumption"]
            discount_amount = -discount_offpeak  # Make negative
            unit_price = (discount_amount * 100) / qty if qty > 0 else 0  # convert to agorot
            vat = discount_amount * VAT_RATE
            out.append({
                "מזהה פריט": "P-6002",
                "תיאור": "הנחה שפל",
                "מש\"ב": "שפל",
                "כמות": qty,
                "יחידת מידה": "kWh",
                "מחיר יחידה": unit_price,
                "סכום ": discount_amount,
                "סכום המע\"מ": vat,
                "סכום כולל מע\"מ": discount_amount + vat,
                "כלול בחיוב": "לא",  # DISPLAY ONLY - discount for transparency
                "מספר חשבונית": row["Document number"],
                "חשבון לקוח משלם": 10003,
                "שם הלקוח המשלם": "עיריית ראשון לציון",
                "שם משתמש עיקרי": row["Site name"],
                "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                "תאריך התחלה": start_date,
                "תאריך הסיום": end_date,
            })

        # 3. CONSUMPTION ITEMS - USE COST WITH DISCOUNT FIELDS
        # Peak consumption charge
        energy_peak_cost = float(row.get("Cost with discount peak", 0))
        if energy_peak_cost > 0:
            # Find the appropriate P-code for peak
            peak_code = None
            for code, desc in items:
                if "פסגה" in desc and "עם הנחה" in desc:
                    peak_code = code
                    break
            
            if peak_code:
                # Calculate unit price from energy cost and quantity
                qty = row["Peak consumption"]
                unit_price = (energy_peak_cost * 100) / qty if qty > 0 else 0  # convert to agorot
                
                out.append({
                    "מזהה פריט": peak_code,
                    "תיאור": f"{tariff_map[tid][0][1]}",
                    "מש\"ב": "פסגה",
                    "כמות": qty, 
                    "יחידת מידה": "kWh",
                    "מחיר יחידה": unit_price,
                    "סכום ": energy_peak_cost,
                    "סכום המע\"מ": energy_peak_cost * VAT_RATE,
                    "סכום כולל מע\"מ": energy_peak_cost * (1 + VAT_RATE),
                    "כלול בחיוב": "כן",  # INCLUDED
                    "מספר חשבונית": row["Document number"],
                    "חשבון לקוח משלם": 10003,
                    "שם הלקוח המשלם": "עיריית ראשון לציון",
                    "שם משתמש עיקרי": row["Site name"],
                    "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                    "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                    "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                    "תאריך התחלה": start_date,
                    "תאריך הסיום": end_date,
                })

        # Off-peak consumption charge
        energy_offpeak_cost = float(row.get("Cost with discount off-peak", 0))
        if energy_offpeak_cost > 0:
            # Find the appropriate P-code for off-peak
            offpeak_code = None
            for code, desc in items:
                if "שפל" in desc and "עם הנחה" in desc:
                    offpeak_code = code
                    break
            
            if offpeak_code:
                # Calculate unit price from energy cost and quantity
                qty = row["Off-peak consumption"]
                unit_price = (energy_offpeak_cost * 100) / qty if qty > 0 else 0  # convert to agorot
                
                out.append({
                    "מזהה פריט": offpeak_code,
                    "תיאור": f"{tariff_map[tid][1][1]}",
                    "מש\"ב": "שפל",
                    "כמות": qty,
                    "יחידת מידה": "kWh", 
                    "מחיר יחידה": unit_price,
                    "סכום ": energy_offpeak_cost,
                    "סכום המע\"מ": energy_offpeak_cost * VAT_RATE,
                    "סכום כולל מע\"מ": energy_offpeak_cost * (1 + VAT_RATE),
                    "כלול בחיוב": "כן",  # INCLUDED
                    "מספר חשבונית": row["Document number"],
                    "חשבון לקוח משלם": 10003,
                    "שם הלקוח המשלם": "עיריית ראשון לציון",
                    "שם משתמש עיקרי": row["Site name"],
                    "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                    "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                    "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                    "תאריך התחלה": start_date,
                    "תאריך הסיום": end_date,
                })

        # 4. INFRASTRUCTURE CHARGES - use exact values from original
        infrastructure = [
            ("P-0005", "חלוקה", "Distribution"),
            ("P-0001", "אספקה", "Supply"), 
            ("P-0011", "עלות החיבור", "KVA cost")
        ]
        
        for code, desc, col in infrastructure:
            if any(code == p for p, _ in items):
                amount = float(row.get(col, 0))
                if amount > 0:
                    out.append({
                        "מזהה פריט": code,
                        "תיאור": desc,
                        "מש\"ב": "",
                        "כמות": 1.0,
                        "יחידת מידה": "",
                        "מחיר יחידה": amount,
                        "סכום ": amount,
                        "סכום המע\"מ": amount * VAT_RATE,
                        "סכום כולל מע\"מ": amount * (1 + VAT_RATE),
                        "כלול בחיוב": "כן",  # INCLUDED
                        "מספר חשבונית": row["Document number"],
                        "חשבון לקוח משלם": 10003,
                        "שם הלקוח המשלם": "עיריית ראשון לציון",
                        "שם משתמש עיקרי": row["Site name"],
                        "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                        "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                        "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                        "תאריך התחלה": start_date,
                        "תאריך הסיום": end_date,
                    })

        # 5. OTHER CHARGES - use exact values
        other_charges = [
            ("P-8001", "קנס מקדם הספק", "Power factor fine"),
            ("P-9001", "שונות", "Various charges"),
        ]
        
        for code, desc, col in other_charges:
            amount = float(row.get(col, 0))
            if amount > 0:
                out.append({
                    "מזהה פריט": code,
                    "תיאור": desc,
                    "מש\"ב": "",
                    "כמות": 1.0,
                    "יחידת מידה": "",
                    "מחיר יחידה": amount,
                    "סכום ": amount,
                    "סכום המע\"מ": amount * VAT_RATE,
                    "סכום כולל מע\"מ": amount * (1 + VAT_RATE),
                    "כלול בחיוב": "כן",  # INCLUDED
                    "מספר חשבונית": row["Document number"],
                    "חשבון לקוח משלם": 10003,
                    "שם הלקוח המשלם": "עיריית ראשון לציון",
                    "שם משתמש עיקרי": row["Site name"],
                    "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                    "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                    "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                    "תאריך התחלה": start_date,
                    "תאריך הסיום": end_date,
                })

        # 6. CREDITS - use exact values (negative)
        credits = float(row.get("Various credits", 0))
        if credits != 0:
            amount = -abs(credits) if credits > 0 else credits  # Ensure negative
            out.append({
                "מזהה פריט": "P-9002",
                "תיאור": "זיכויים",
                "מש\"ב": "",
                "כמות": 1.0,
                "יחידת מידה": "",
                "מחיר יחידה": amount,
                "סכום ": amount,
                "סכום המע\"מ": amount * VAT_RATE,
                "סכום כולל מע\"מ": amount * (1 + VAT_RATE),
                "כלול בחיוב": "כן",  # INCLUDED
                "מספר חשבونית": row["Document number"],
                "חשבון לקוח משלם": 10003,
                "שם הלקוח המשלם": "עיריית ראשון לציון",
                "שם משתמש עיקרי": row["Site name"],
                "מספר  מזהה לחיבור": str(row["Site ID"]).replace("'", "").replace('"', '').strip(),
                "מספר מונה חח\"י": str(row["Meter IEC long number"]).replace("'", "").strip(),
                "מספר חוזה": str(row["Contract number"]).replace("'", "").strip(),
                "תאריך התחלה": start_date,
                "תאריך הסיום": end_date,
            })

    # Create DataFrame
    df_out = pd.DataFrame(out)

    # Keep P-50xx even if zero (for display)
    keep_gross = df_out["מזהה פריט"].str.startswith("P-50")
    df_out = df_out[(df_out["סכום "] != 0) | keep_gross]

    # Sort and add row numbers
    order = {"P-5004": 1, "P-5008": 1, "P-5038": 1, "P-5048": 1,
             "P-6001": 2,  # Peak discount
             "P-5005": 3, "P-5009": 3, "P-5039": 3, "P-5049": 3,
             "P-6002": 4,  # Off-peak discount
             "P-0001": 6, "P-0005": 7, "P-0011": 8,
             "P-8001": 9, "P-9001": 10, "P-9002": 11}
    df_out["pr"] = df_out["מזהה פריט"].map(order).fillna(5)
    df_out.sort_values(["מספר חשבונית", "pr"], inplace=True)
    df_out["מספר שורה"] = df_out.groupby("מספר חשבונית").cumcount() + 1
    df_out.drop(columns="pr", inplace=True)

    cols = ["מספר שורה","מספר חשבונית","חשבון לקוח משלם","שם הלקוח המשלם",
            "שם משתמש עיקרי","מספר  מזהה לחיבור","מספר מונה חח\"י","מספר חוזה",
            "מזהה פריט","תיאור","תאריך התחלה","תאריך הסיום","מש\"ב",
            "כמות","יחידת מידה","מחיר יחידה",
            "סכום ","סכום המע\"מ","סכום כולל מע\"מ","כלול בחיוב"]
    df_out = df_out[cols]

    # Write to Excel
    with pd.ExcelWriter(dst_path, engine="openpyxl") as wr:
        df_out.to_excel(wr, index=False)
        ws = wr.sheets["Sheet1"]
        for c in ("כמות","מחיר יחידה","סכום ","סכום המע\"מ","סכום כולל מע\"מ"):
            if c in cols:
                idx = cols.index(c) + 1
                for r in range(2, len(df_out) + 2):
                    ws.cell(r, idx).number_format = "0.000"

    # Verify totals
    included_items = df_out[df_out["כלול בחיוב"] == "כן"]
    our_total = included_items["סכום "].sum()
    csv_total = df["Total cost"].sum()
    gap_amount = csv_total - our_total
    
    # Return processing results as dictionary
    results = {
        'csv_total': float(csv_total),
        'excel_total': float(our_total),
        'gap_amount': float(gap_amount),
        'total_rows': len(df_out),
        'included_items': len(included_items),
        'output_file': dst_path
    }
    
    return results

if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 3:
        print("Usage: python transform_final_corrected.py <input_file> <output_file>")
        sys.exit(1)
    
    src = sys.argv[1]
    dst = sys.argv[2]
    
    try:
        # Process the file
        result = transform_final_corrected(src, dst)
        
        # Output result as JSON for the backend to parse
        print(json.dumps(result))
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)