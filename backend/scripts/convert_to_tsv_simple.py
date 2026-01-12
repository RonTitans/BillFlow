#!/usr/bin/env python3
"""
Simple Excel to TSV converter for the billing system
"""
import sys
import os
import re
import pandas as pd
from datetime import datetime

def convert_excel_to_tsv(excel_path, tsv_path=None):
    """Convert Excel file to TSV format with proper naming convention"""
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        
        # If no output path specified, generate one with proper naming
        if tsv_path is None:
            filename = os.path.basename(excel_path)
            output_dir = os.path.dirname(excel_path)
            
            # Try to extract month/year from the Excel filename
            match = re.search(r'invoice_lines [-–] (\d{6})_(\d{8}_\d{4})', filename)
            if match:
                # Already in new format, just change extension to .txt
                data_month = match.group(1)
                timestamp = match.group(2)
            else:
                # Try to extract from old format or use current date
                match_old = re.search(r'(\w+)\s+(\d{4})', filename)
                if match_old:
                    month_name = match_old.group(1)
                    year = match_old.group(2)
                    # Map Hebrew months to numbers
                    month_map = {
                        'ינואר': '01', 'פברואר': '02', 'מרץ': '03', 'אפריל': '04',
                        'מאי': '05', 'יוני': '06', 'יולי': '07', 'אוגוסט': '08',
                        'ספטמבר': '09', 'אוקטובר': '10', 'נובמבר': '11', 'דצמבר': '12',
                        'January': '01', 'February': '02', 'March': '03', 'April': '04',
                        'May': '05', 'June': '06', 'July': '07', 'August': '08',
                        'September': '09', 'October': '10', 'November': '11', 'December': '12'
                    }
                    month = month_map.get(month_name, datetime.now().strftime('%m'))
                    data_month = f"{year}{month}"
                else:
                    # Use current date if no pattern found
                    data_month = datetime.now().strftime("%Y%m")
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            
            # Generate filename: invoice_lines - YYYYMM_YYYYMMDD_HHMM.txt
            tsv_filename = f"invoice_lines - {data_month}_{timestamp}.txt"
            tsv_path = os.path.join(output_dir, tsv_filename)
        
        # Write to TSV (tab-separated values)
        df.to_csv(tsv_path, sep='\t', index=False, encoding='utf-8')
        
        return True
    except Exception as e:
        print(f"Error converting to TSV: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_to_tsv_simple.py <input.xlsx> [output.txt]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    if convert_excel_to_tsv(input_file, output_file):
        if output_file:
            print(f"Successfully converted to {output_file}")
        else:
            print("Successfully converted with auto-generated filename")
        sys.exit(0)
    else:
        sys.exit(1)