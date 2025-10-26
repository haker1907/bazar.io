# Marketplace Admin Panel

A React Next.js admin panel for marketplace management with Supabase integration.

## Features

- **Authentication**: Email/password login using Supabase Auth
- **Persistent Shop Selection**: Shop selection saved to user profile
- **Market Selection**: Multi-level selection (Market → Block → Shop)
- **Product Management**: Add, edit, delete products with image upload
- **Image Storage**: Product images stored in Supabase Storage
- **Shop Switching**: Ability to change shop selection anytime
- **Responsive UI**: Clean and modern interface built with Tailwind CSS

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database Setup

Run the SQL commands from `database-setup.sql` in your Supabase SQL editor to create the required tables:

```sql
-- Create markets table
CREATE TABLE markets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocks table
CREATE TABLE blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shops table
CREATE TABLE shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  contact_number TEXT NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for authenticated users)
CREATE POLICY "Allow all for authenticated users" ON markets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON blocks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON shops FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');
```

### 4. Create Admin Accounts

**Important**: This system uses login-only authentication. You need to manually create admin accounts for your customers.

#### Method 1: Using Supabase Dashboard (Recommended)
1. Go to **Authentication > Users** in your Supabase dashboard
2. Click **"Add user"**
3. Enter email and password for your admin
4. Set **email_confirmed** to `true`
5. Save the user
6. Provide these credentials to your admin customers

#### Method 2: Using SQL
Run the commands from `create-admin-accounts.sql` in your Supabase SQL editor.

#### Sample Admin Accounts
You can create accounts like:
- Email: `admin1@marketplace.com`, Password: `admin123`
- Email: `shopowner1@marketplace.com`, Password: `shop123`
- Email: `admin2@marketplace.com`, Password: `admin123`

### 5. Storage Setup

The storage bucket `product-images` is automatically created by the database setup script. If you need to create it manually:

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `product-images`
3. Set the bucket to public

### 6. Sample Data

The database setup script automatically includes sample data for markets, blocks, and shops. You can add more data as needed.

### 7. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Administrators (Account Creation)
1. **Create Admin Account**: Create user account in Supabase Dashboard
2. **First Login**: Login with new credentials
3. **One-Time Setup**: Select your assigned Market → Block → Shop
4. **Setup Complete**: Shop selection is permanent and cannot be changed

### For Admin Users (Daily Use)
1. **Login**: Use your provided admin credentials
2. **Dashboard**: Go directly to your assigned shop's dashboard
3. **Manage Products**: 
   - **Add Product**: Click "Add Product" button to open modal
   - **Edit Product**: Click "Edit" button on any product card
   - **Delete Product**: Click "Delete" button on any product card
4. **Upload Images**: Product images are automatically uploaded to Supabase Storage

**Note**: Shop assignment is permanent and done only once during account setup. All product management is done through popup modals for a better user experience.

## Project Structure

```
src/
├── app/
│   ├── login/page.tsx          # Login page
│   ├── select-market/page.tsx  # One-time shop assignment setup
│   └── dashboard/page.tsx      # Main dashboard with product management
├── components/
│   └── ProductModal.tsx        # Modal for adding/editing products
├── contexts/
│   └── AuthContext.tsx         # Authentication context
└── lib/
    └── supabase.ts            # Supabase client configuration
```

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend and authentication
- **Supabase Storage** - Image storage