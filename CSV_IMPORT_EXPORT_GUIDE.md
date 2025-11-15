# CSV Import/Export Guide

This guide explains how to use the CSV import/export functionality for customers and products in the salon dashboard.

## Features

The CSV import/export feature is available on:
- **Customers Page** (`/customers`)
- **Products Page** (`/products`)

Each page provides three buttons:
1. **Export CSV** - Download current data as CSV
2. **Import CSV** - Upload and import data from CSV file
3. **Sample CSV** - Download a template with sample data

## How to Export Data

1. Navigate to the Customers or Products page
2. Click the **"Export CSV"** button (green)
3. A CSV file will be downloaded with today's date in the filename
   - Format: `customers_YYYY-MM-DD.csv` or `products_YYYY-MM-DD.csv`
4. The file contains all current records with proper formatting

## How to Import Data

### Step 1: Download Sample CSV Template

1. Click the **"Sample CSV"** button (purple)
2. This downloads a template file with:
   - Proper column headers
   - Example data rows showing correct format
   - All required and optional fields

### Step 2: Prepare Your CSV File

**For Customers:**
- Required fields: `Name`, `Phone`
- Optional fields: `Birth Date`, `Gender`, `Address`, `Anniversary`, `Membership Type`, `Join Date`, `Total Spent`, `Visits`
- Date format: `YYYY-MM-DD` (e.g., 2024-01-15)
- Membership types: `None`, `Silver`, `Silver Plus`, `Gold`, `Non-Membership`, etc.

Example customer CSV:
```csv
Name,Phone,Birth Date,Gender,Address,Anniversary,Membership Type,Join Date,Total Spent,Visits
John Doe,9876543210,1990-01-15,Male,"123 Main St, City",2015-06-20,Gold,2024-01-01,15000,12
Jane Smith,9876543211,1985-05-22,Female,"456 Oak Ave, Town",,Silver,2024-02-15,8500,8
```

**For Products:**
- Required fields: `Title`, `Price`
- Price should be numeric (no currency symbols)

Example product CSV:
```csv
Title,Price
Hair Serum Premium,1500
Conditioning Treatment,2500
Hair Oil Organic,800
```

### Step 3: Import the CSV File

1. Click the **"Import CSV"** button (blue)
2. Select your prepared CSV file
3. The system will:
   - Validate the file format
   - Parse the data
   - Import all valid records
   - Show success/error messages
4. The page will automatically refresh to show imported data

## Important Notes

### CSV Format Guidelines

- **Encoding**: UTF-8 is recommended
- **Quotes**: Text containing commas or newlines should be quoted
  - Example: `"123 Main St, City"`
- **Escaped Quotes**: Use double quotes to escape quotes within quoted text
  - Example: `"He said ""Hello"""`
- **Empty Fields**: Leave blank or use empty quotes `""`
- **Numbers**: Don't include currency symbols or thousand separators
  - Correct: `15000`
  - Incorrect: `₹15,000` or `$15,000`

### Data Validation

**Customers Import:**
- Phone numbers are stored as-is (no validation)
- Dates must be in `YYYY-MM-DD` format
- Invalid dates will be stored as null
- `Total Spent` and `Visits` default to 0 if not provided or invalid
- New customers get `last_visit` set to today's date

**Products Import:**
- Price is converted to float (decimals allowed)
- Invalid prices default to 0
- Duplicate titles are allowed (no uniqueness check)

### Error Handling

If import fails:
- Check the error message displayed
- Common issues:
  - File is not a CSV
  - Missing required columns
  - File is empty
  - Invalid data format
- Fix the issues and try importing again

### Performance

- **Customers**: Uses batch insert for faster import
- **Products**: Inserts one by one (slower for large datasets)
- Large imports may take a few seconds
- Wait for success message before navigating away

## Sample Data Included

### Customer Sample (2 records)
- John Doe: Gold member with full profile
- Jane Smith: Silver member without anniversary

### Product Sample (3 records)
- Hair care products with varying prices
- Demonstrates proper title and price formatting

## Tips

1. **Backup First**: Export your current data before importing new data
2. **Test with Sample**: Download and test with sample CSV first
3. **Small Batches**: For large datasets, import in smaller batches
4. **Excel Users**: Save as "CSV (Comma delimited)" format, not "CSV UTF-8"
5. **Verify After Import**: Check the imported data for accuracy

## Troubleshooting

**Q: Import button doesn't respond**
- A: Make sure you selected a `.csv` file, not `.xlsx` or other format

**Q: Some rows didn't import**
- A: Check that all required fields (Name/Phone for customers, Title/Price for products) are filled

**Q: Dates not importing correctly**
- A: Use `YYYY-MM-DD` format (e.g., 2024-01-15, not 15/01/2024)

**Q: Excel opens CSV with wrong encoding**
- A: Use a text editor or import wizard in Excel to preserve UTF-8

**Q: Special characters appear as symbols**
- A: Save your CSV with UTF-8 encoding

## Support

For issues or questions about CSV import/export, contact your system administrator.
