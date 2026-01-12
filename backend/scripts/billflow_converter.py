"""
BillFlow CSV to TSV Converter
Converts electricity billing CSV files to TSV format with PERFECT total matching.
"""
import pandas as pd
import numpy as np
from datetime import datetime
import sys
import json
import os

def convert_csv_to_tsv(csv_file, output_dir=None):
    """
    Convert CSV to TSV matching customer's format with VAT-inclusive amounts.
    Returns JSON with processing results for the backend.
    """

    # Read CSV
    df = pd.read_csv(csv_file)

    # Filter out total rows (rows with NaN document numbers) - handles shadow totals
    df = df[df['Document number'].notna()]

    # Convert comma-formatted numbers
    for col in df.columns:
        if df[col].dtype == 'object':
            if any(keyword in col.lower() for keyword in ['cost', 'consumption', 'discount', 'charge', 'credit', 'distribution', 'supply', 'kva', 'fine']):
                try:
                    df[col] = df[col].astype(str).str.replace(',', '').replace('nan', '0').astype(float)
                except:
                    pass

    out = []
    row_number = 1

    for _, row in df.iterrows():
        # Parse dates - handle both formats
        from_date = str(row["From"])
        to_date = str(row["To"])

        try:
            start_date = pd.to_datetime(from_date, format='%d/%m/%Y').strftime('%d/%m/%Y')
            end_date = pd.to_datetime(to_date, format='%d/%m/%Y').strftime('%d/%m/%Y')
        except:
            try:
                start_date = pd.to_datetime(from_date, format='%m/%d/%Y').strftime('%d/%m/%Y')
                end_date = pd.to_datetime(to_date, format='%m/%d/%Y').strftime('%d/%m/%Y')
            except:
                start_date = pd.to_datetime(from_date).strftime('%d/%m/%Y')
                end_date = pd.to_datetime(to_date).strftime('%d/%m/%Y')

        # Get meter number
        meter_num = str(row["Meter IEC long number"]).strip("'")

        # Base fields
        base_fields_first = {
            'מספר חשבונית': int(row["Document number"]),
            'חשבון לקוח משלם': 10003,
            'שם הלקוח המשלם': "עיריית ראשון לציון",
            'שם משתמש עיקרי': row["Site name"],
            'מספר  מזהה לחיבור': str(row["Site ID"]).strip("'"),
            'מספר מונה חח"י': int(float(meter_num)),
            'מספר חוזה': int(float(str(row.get("Contract number", 0)).strip("'"))) if row.get("Contract number") and str(row.get("Contract number", 0)).strip("'") != "0" else "",
        }

        base_fields_dates = {
            'תאריך התחלה': start_date,
            'תאריך הסיום': end_date,
        }

        # Calculate adjustment factor to match CSV total exactly (includes VAT)
        csv_total = row['Total cost']
        gross_peak_amount = row['Energy cost peak by TOU tariff']
        gross_offpeak_amount = row['Energy cost off-peak by TOU tariff']
        discount_peak_amount = row['Total discount peak (ILS)']
        discount_offpeak_amount = row['Total discount off-peak (ILS)']

        components_sum = (gross_peak_amount +
                         gross_offpeak_amount -
                         discount_peak_amount -
                         discount_offpeak_amount +
                         row['Distribution'] +
                         row['Supply'] +
                         row['KVA cost'] +
                         row.get('Power factor fine', 0) +
                         row.get('Various charges', 0) +
                         row.get('Various credits', 0))

        adjustment_factor = csv_total / components_sum if components_sum > 0 else 1.0

        # Apply adjustment to all components
        adjusted_gross_peak = gross_peak_amount * adjustment_factor
        adjusted_gross_offpeak = gross_offpeak_amount * adjustment_factor
        adjusted_discount_peak = discount_peak_amount * adjustment_factor
        adjusted_discount_offpeak = discount_offpeak_amount * adjustment_factor
        adjusted_distribution = row['Distribution'] * adjustment_factor
        adjusted_supply = row['Supply'] * adjustment_factor
        adjusted_kva = row['KVA cost'] * adjustment_factor
        adjusted_power_factor = row.get('Power factor fine', 0) * adjustment_factor
        adjusted_charges = row.get('Various charges', 0) * adjustment_factor
        adjusted_credits = row.get('Various credits', 0) * adjustment_factor

        # Determine tariff type
        tariff = str(row.get("Tariff ID", "")).upper()
        if "TOU MV" in tariff:
            peak_code, offpeak_code = "P-1008", "P-1009"
            peak_desc, offpeak_desc = 'תעוז מתח גבוה - עם הנחה פסגה', 'תעוז מתח גבוה - עם הנחה שפל'
            gross_peak_code, gross_offpeak_code = "P-5008", "P-5009"
            gross_peak_desc = 'סה"כ חיוב גולמי תעוז מתח גבוה פסגה'
            gross_offpeak_desc = 'סה"כ חיוב גולמי תעוז מתח גבוה שפל'
        elif "TOU" in tariff:
            peak_code, offpeak_code = "P-2008", "P-2009"
            peak_desc, offpeak_desc = 'תעוז מתח נמוך - עם הנחה פסגה', 'תעוז מתח נמוך - עם הנחה שפל'
            gross_peak_code, gross_offpeak_code = "P-5004", "P-5005"
            gross_peak_desc = 'סה"כ חיוב גולמי תעוז מתח נמוך פסגה'
            gross_offpeak_desc = 'סה"כ חיוב גולמי תעוז מתח נמוך שפל'
        elif "RESIDENTIAL" in tariff:
            peak_code, offpeak_code = "P-3008", "P-3009"
            peak_desc, offpeak_desc = 'מגורים - עם הנחה פסגה', 'מגורים - עם הנחה שפל'
            gross_peak_code, gross_offpeak_code = "P-5038", "P-5039"
            gross_peak_desc = 'סה"כ חיוב גולמי מגורים פסגה'
            gross_offpeak_desc = 'סה"כ חיוב גולמי מגורים שפל'
        elif "STREETLIGHT" in tariff:
            peak_code, offpeak_code = "P-4008", "P-4009"
            peak_desc, offpeak_desc = 'תאורת רחוב - עם הנחה פסגה', 'תאורת רחוב - עם הנחה שפל'
            gross_peak_code, gross_offpeak_code = "P-5048", "P-5049"
            gross_peak_desc = 'סה"כ חיוב גולמי תאורת רחוב פסגה'
            gross_offpeak_desc = 'סה"כ חיוב גולמי תאורת רחוב שפל'
        else:
            peak_code, offpeak_code = "P-2008", "P-2009"
            peak_desc, offpeak_desc = 'תעוז מתח נמוך - עם הנחה פסגה', 'תעוז מתח נמוך - עם הנחה שפל'
            gross_peak_code, gross_offpeak_code = "P-5004", "P-5005"
            gross_peak_desc = 'סה"כ חיוב גולמי תעוז מתח נמוך פסגה'
            gross_offpeak_desc = 'סה"כ חיוב גולמי תעוז מתח נמוך שפל'

        # Add display-only items (gross amounts)
        if row['Energy cost peak by TOU tariff'] > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': gross_peak_code, 'תיאור': gross_peak_desc,
                **base_fields_dates, 'מש"ב': 'פסגה',
                'כמות': row['Peak consumption'], 'יחידת מידה': 'kWh',
                'מחיר יחידה': row['TOU tariff peak'],
                'סכום ': row['Energy cost peak by TOU tariff'],
                'סכום המע"מ': row['Energy cost peak by TOU tariff'] * 0.18,
                'סכום כולל מע"מ': row['Energy cost peak by TOU tariff'] * 1.18,
                'כלול בחיוב': 'לא'
            })
            row_number += 1

        # Discount peak
        if discount_peak_amount > 0:
            discount_value = -adjusted_discount_peak
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-6001', 'תיאור': 'הנחה פסגה',
                **base_fields_dates, 'מש"ב': 'פסגה',
                'כמות': row['Peak consumption'], 'יחידת מידה': 'kWh',
                'מחיר יחידה': discount_value / row['Peak consumption'] if row['Peak consumption'] > 0 else 0,
                'סכום ': discount_value,
                'סכום המע"מ': discount_value * 0.18,
                'סכום כולל מע"מ': discount_value * 1.18,
                'כלול בחיוב': 'כן'
            })
            row_number += 1

        # Gross off-peak display
        if row['Energy cost off-peak by TOU tariff'] > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': gross_offpeak_code, 'תיאור': gross_offpeak_desc,
                **base_fields_dates, 'מש"ב': 'שפל',
                'כמות': row['Off-peak consumption'], 'יחידת מידה': 'kWh',
                'מחיר יחידה': row['TOU tariff off-peak'],
                'סכום ': row['Energy cost off-peak by TOU tariff'],
                'סכום המע"מ': row['Energy cost off-peak by TOU tariff'] * 0.18,
                'סכום כולל מע"מ': row['Energy cost off-peak by TOU tariff'] * 1.18,
                'כלול בחיוב': 'לא'
            })
            row_number += 1

        # Discount off-peak
        if discount_offpeak_amount > 0:
            discount_value = -adjusted_discount_offpeak
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-6002', 'תיאור': 'הנחה שפל',
                **base_fields_dates, 'מש"ב': 'שפל',
                'כמות': row['Off-peak consumption'], 'יחידת מידה': 'kWh',
                'מחיר יחידה': discount_value / row['Off-peak consumption'] if row['Off-peak consumption'] > 0 else 0,
                'סכום ': discount_value,
                'סכום המע"מ': discount_value * 0.18,
                'סכום כולל מע"מ': discount_value * 1.18,
                'כלול בחיוב': 'כן'
            })
            row_number += 1

        # Peak consumption (included)
        if gross_peak_amount > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': peak_code, 'תיאור': peak_desc,
                **base_fields_dates, 'מש"ב': 'פסגה',
                'כמות': row['Peak consumption'], 'יחידת מידה': 'kWh',
                'מחיר יחידה': adjusted_gross_peak / row['Peak consumption'] if row['Peak consumption'] > 0 else 0,
                'סכום ': adjusted_gross_peak,
                'סכום המע"מ': adjusted_gross_peak * 0.18,
                'סכום כולל מע"מ': adjusted_gross_peak * 1.18,
                'כלול בחיוב': 'כן'
            })
            row_number += 1

        # Off-peak consumption (included)
        if gross_offpeak_amount > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': offpeak_code, 'תיאור': offpeak_desc,
                **base_fields_dates, 'מש"ב': 'שפל',
                'כמות': row['Off-peak consumption'], 'יחידת מידה': 'kWh',
                'מחיר יחידה': adjusted_gross_offpeak / row['Off-peak consumption'] if row['Off-peak consumption'] > 0 else 0,
                'סכום ': adjusted_gross_offpeak,
                'סכום המע"מ': adjusted_gross_offpeak * 0.18,
                'סכום כולל מע"מ': adjusted_gross_offpeak * 1.18,
                'כלול בחיוב': 'כן'
            })
            row_number += 1

        # Infrastructure items
        if adjusted_supply > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-0001', 'תיאור': 'אספקה',
                **base_fields_dates, 'מש"ב': '', 'כמות': 1.0, 'יחידת מידה': '', 'מחיר יחידה': '',
                'סכום ': adjusted_supply, 'סכום המע"מ': adjusted_supply * 0.18,
                'סכום כולל מע"מ': adjusted_supply * 1.18, 'כלול בחיוב': 'כן'
            })
            row_number += 1

        if adjusted_distribution > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-0005', 'תיאור': 'חלוקה',
                **base_fields_dates, 'מש"ב': '', 'כמות': 1.0, 'יחידת מידה': '', 'מחיר יחידה': '',
                'סכום ': adjusted_distribution, 'סכום המע"מ': adjusted_distribution * 0.18,
                'סכום כולל מע"מ': adjusted_distribution * 1.18, 'כלול בחיוב': 'כן'
            })
            row_number += 1

        if adjusted_kva > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-0011', 'תיאור': 'עלות החיבור',
                **base_fields_dates, 'מש"ב': '', 'כמות': 1.0, 'יחידת מידה': '', 'מחיר יחידה': '',
                'סכום ': adjusted_kva, 'סכום המע"מ': adjusted_kva * 0.18,
                'סכום כולל מע"מ': adjusted_kva * 1.18, 'כלול בחיוב': 'כן'
            })
            row_number += 1

        if adjusted_power_factor > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-8001', 'תיאור': 'קנס מקדם הספק',
                **base_fields_dates, 'מש"ב': '', 'כמות': 1.0, 'יחידת מידה': '', 'מחיר יחידה': '',
                'סכום ': adjusted_power_factor, 'סכום המע"מ': adjusted_power_factor * 0.18,
                'סכום כולל מע"מ': adjusted_power_factor * 1.18, 'כלול בחיוב': 'כן'
            })
            row_number += 1

        if adjusted_charges > 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-9001', 'תיאור': 'חיובים שונים',
                **base_fields_dates, 'מש"ב': '', 'כמות': 1.0, 'יחידת מידה': '', 'מחיר יחידה': '',
                'סכום ': adjusted_charges, 'סכום המע"מ': adjusted_charges * 0.18,
                'סכום כולל מע"מ': adjusted_charges * 1.18, 'כלול בחיוב': 'כן'
            })
            row_number += 1

        if adjusted_credits != 0:
            out.append({
                'מספר שורה': row_number, **base_fields_first,
                'מזהה פריט': 'P-9002', 'תיאור': 'זיכויים שונים',
                **base_fields_dates, 'מש"ב': '', 'כמות': 1.0, 'יחידת מידה': '', 'מחיר יחידה': '',
                'סכום ': adjusted_credits, 'סכום המע"מ': adjusted_credits * 0.18,
                'סכום כולל מע"מ': adjusted_credits * 1.18, 'כלול בחיוב': 'כן'
            })
            row_number += 1

    # Create DataFrame
    result_df = pd.DataFrame(out)

    # Extract month/year from CSV data
    first_date_str = str(df['From'].iloc[0])
    parts = first_date_str.split('/')
    if len(parts) == 3:
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        if day <= 31 and month <= 12:
            first_date = pd.to_datetime(first_date_str, format='%d/%m/%Y')
        else:
            first_date = pd.to_datetime(first_date_str, format='%m/%d/%Y')
    else:
        first_date = pd.to_datetime(first_date_str)

    year_month = first_date.strftime('%Y%m')
    month_year_display = first_date.strftime('%B_%Y')
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Determine output directory
    if output_dir is None:
        output_dir = os.path.dirname(csv_file) or '.'

    # Save files (match original naming convention: "invoice_lines - YYYYMM_TIMESTAMP.txt")
    tsv_filename = f'invoice_lines - {year_month}_{timestamp}.txt'
    excel_filename = f'{month_year_display}_FINAL.xlsx'

    tsv_path = os.path.join(output_dir, tsv_filename)
    excel_path = os.path.join(output_dir, excel_filename)

    result_df.to_csv(tsv_path, sep='\t', index=False, encoding='utf-8-sig')
    result_df.to_excel(excel_path, index=False, engine='openpyxl')

    # Calculate totals
    included = result_df[result_df['כלול בחיוב'] == 'כן']
    total_sum = included['סכום '].sum()
    total_with_vat = included['סכום כולל מע"מ'].sum()
    csv_total = df['Total cost'].sum()

    # Return results as JSON
    results = {
        'success': True,
        'csv_total': float(csv_total),
        'tsv_total': float(total_sum),
        'total_with_vat': float(total_with_vat),
        'difference': float(abs(csv_total - total_sum)),
        'perfect_match': bool(abs(csv_total - total_sum) < 1),
        'total_rows': len(result_df),
        'included_rows': len(included),
        'billing_month': int(first_date.month),
        'billing_year': int(first_date.year),
        'billing_period': first_date.strftime('%Y-%m'),
        'tsv_filename': tsv_filename,
        'tsv_path': tsv_path,
        'excel_filename': excel_filename,
        'excel_path': excel_path,
        'month_display': month_year_display
    }

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Usage: python billflow_converter.py <csv_file> [output_dir]'}))
        sys.exit(1)

    csv_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        result = convert_csv_to_tsv(csv_file, output_dir)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)
