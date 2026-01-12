import os
import glob
import pandas as pd
import sys
import io

# Set UTF-8 encoding for stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def convert_excel_to_tsv(input_folder: str, output_folder: str = None):
    """
    Convert Excel files to TSV (Tab Separated Values) format for Google Sheets.
    
    Parameters:
    -----------
    input_folder : str
        Path to folder containing Excel files
    output_folder : str, optional
        Path to folder where TSV files will be saved.
        If None, saves to input_folder/TSV_Files
    """
    
    if not os.path.exists(input_folder):
        print(f"❌ Folder not found: {input_folder}")
        return
    
    # Set output folder
    if output_folder is None:
        output_folder = os.path.join(input_folder, "TSV_Files")
    
    # Create output folder if it doesn't exist
    os.makedirs(output_folder, exist_ok=True)
    
    # Find all Excel files
    excel_pattern = os.path.join(input_folder, "*.xlsx")
    excel_files = glob.glob(excel_pattern)
    
    if not excel_files:
        print(f"❌ No Excel (.xlsx) files found in: {input_folder}")
        return
    
    print(f"📊 Converting {len(excel_files)} Excel files to TSV format")
    print(f"📂 Input folder: {input_folder}")
    print(f"📁 Output folder: {output_folder}")
    print("🔄 TSV format is perfect for Google Sheets import")
    print()
    
    successful = 0
    failed = 0
    
    for i, excel_file in enumerate(excel_files, 1):
        filename = os.path.basename(excel_file)
        print(f"📝 [{i}/{len(excel_files)}] Converting: {filename}")
        
        try:
            # Read Excel file
            df = pd.read_excel(excel_file)
            
            # Create standardized TSV filename
            import re
            from datetime import datetime
            
            # Try to extract month/year from the Excel filename
            match = re.search(r'invoice_lines [-–] (\d{6})_(\d{8}_\d{4})', filename)
            if match:
                # Already in new format, just change extension to .txt
                data_month = match.group(1)
                timestamp = match.group(2)
            else:
                # Try to extract from old format
                match_old = re.search(r'(\w+)\s+(\d{4})', filename)
                if match_old:
                    month_name = match_old.group(1)
                    year = match_old.group(2)
                    # Map Hebrew months to numbers
                    month_map = {
                        'ינואר': '01', 'פברואר': '02', 'מרץ': '03', 'אפריל': '04',
                        'מאי': '05', 'יוני': '06', 'יולי': '07', 'אוגוסט': '08',
                        'ספטמבר': '09', 'אוקטובר': '10', 'נובמבר': '11', 'דצמבר': '12'
                    }
                    month = month_map.get(month_name, '01')
                    data_month = f"{year}{month}"
                else:
                    # Fallback to current date
                    data_month = datetime.now().strftime("%Y%m")
                
                # Generate new timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M")
            
            # New filename format: invoice_lines - YYYYMM_YYYYMMDD_HHMM.txt (TSV with .txt extension)
            tsv_filename = f"invoice_lines - {data_month}_{timestamp}.txt"
            tsv_path = os.path.join(output_folder, tsv_filename)
            
            # Convert to TSV (tab-separated values)
            df.to_csv(
                tsv_path,
                sep='\t',  # Tab separator
                index=False,  # Don't include row numbers
                encoding='utf-8-sig'  # UTF-8 with BOM for better Excel/Google Sheets compatibility
            )
            
            print(f"   ✅ Success: {len(df)} rows → {tsv_filename}")
            successful += 1
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            failed += 1
    
    print()
    print("=" * 70)
    print(f"🎉 TSV CONVERSION COMPLETED!")
    print(f"✅ Successfully converted: {successful} files")
    print(f"❌ Failed: {failed} files")
    print(f"📁 TSV files saved to: {output_folder}")
    print()
    print("📋 How to use TSV files:")
    print("1. Open Google Sheets")
    print("2. File → Import → Upload → Select .tsv file")
    print("3. Choose 'Tab' as separator")
    print("4. Import data")
    print("=" * 70)

def convert_specific_folder(folder_path: str):
    """
    Convert Excel files in a specific folder to TSV
    """
    print(f"🎯 Converting Excel files in: {folder_path}")
    convert_excel_to_tsv(folder_path)

def main():
    """
    Main function - you can specify which folder to convert
    """
    
    print("Excel to TSV Converter for Google Sheets")
    print("=" * 50)
    
    # DEFAULT FOLDERS TO TRY:
    possible_folders = [
        r"F:\ClaudeCode\test files\Before\Processed_Excel_Files",  # Batch processed files
        r"F:\ClaudeCode\test files\VAT_fix",  # VAT corrected files
        r"F:\ClaudeCode\test files",  # Test files folder
    ]
    
    print("Available folders with Excel files:")
    print()
    
    available_folders = []
    for i, folder in enumerate(possible_folders, 1):
        if os.path.exists(folder):
            excel_files = glob.glob(os.path.join(folder, "*.xlsx"))
            if excel_files:
                print(f"{i}. {folder} ({len(excel_files)} Excel files)")
                available_folders.append(folder)
            else:
                print(f"{i}. {folder} (no Excel files)")
        else:
            print(f"{i}. {folder} (folder not found)")
    
    print()
    
    if available_folders:
        print("🚀 Converting all available folders:")
        for folder in available_folders:
            print(f"\n📂 Processing: {folder}")
            convert_excel_to_tsv(folder)
    else:
        print("❌ No Excel files found in any default folders")
        print("You can manually specify a folder path:")
        print('convert_excel_to_tsv("C:\\path\\to\\your\\excel\\files")')

if __name__ == "__main__":
    main()