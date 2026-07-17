# Testing Meeplewood on Android (Local Development)

This guide explains how to test local changes on your Android device without publishing the website online.

## Prerequisites

- Python installed on your computer (version 3.x)
- Android device with a web browser (Chrome, Firefox, Samsung Internet, etc.)
- Both devices connected to the same WiFi network

## Method 1: Python HTTP Server (Recommended)

### Step 1: Start the Local Server

1. Open PowerShell or Command Prompt
2. Navigate to the Meeplewood directory:
   ```powershell
   cd c:\Data\Meeplewood
   ```

3. Start the Python HTTP server:
   ```powershell
   python -m http.server 8000
   ```

4. You should see:
   ```
   Serving HTTP on :: port 8000 (http://[::]:8000/) ...
   ```

### Step 2: Find Your Local IP Address

In a **new** PowerShell window (keep the server running):
```powershell
ipconfig | findstr /i "IPv4"
```

Look for your local network IP address (usually starts with `192.168.x.x` or `10.0.x.x`)

Example output:
```
IPv4 Address. . . . . . . . . . . : 192.168.178.77
```

### Step 3: Access from Android

1. **Ensure your Android device is on the same WiFi network** as your computer
2. Open a web browser on your Android device
3. Navigate to: `http://YOUR_IP_ADDRESS:8000`
   - Example: `http://192.168.178.77:8000`
4. Click on `index.html` or navigate directly to:
   - `http://192.168.178.77:8000/index.html`

### Step 4: Test Your Changes

Navigate through the site and test the features you've modified:
- File pickers (Settings → Import BGG GeekPreview List)
- Local storage (Settings → User Name & Default Data Path)
- Any other functionality

### Step 5: Stop the Server

When finished testing, go back to the PowerShell window and press:
```
Ctrl + C
```

## Method 2: VS Code Live Server Extension

If you have the Live Server extension installed in VS Code:

1. Right-click on `index.html` in the VS Code file explorer
2. Select **"Open with Live Server"**
3. The server will start (usually on port 5500)
4. Find your IP address using the same method as above
5. Access from Android: `http://YOUR_IP_ADDRESS:5500`

**Advantages:**
- Auto-reloads when you save files
- Shows which files are being accessed
- Easy to start/stop

## Troubleshooting

### Can't connect from Android

1. **Check WiFi:** Ensure both devices are on the same WiFi network (not guest network)
2. **Firewall:** Windows Firewall might be blocking the connection
   - Go to Windows Defender Firewall → Allow an app
   - Allow Python through both Private and Public networks
3. **Try different port:** Use `python -m http.server 3000` instead
4. **Check IP:** Make sure you're using the correct local IP address

### File picker not working on Android

1. **Try different browsers:**
   - Chrome (recommended)
   - Firefox
   - Samsung Internet
   - Edge

2. **Move files:** Move the CSV/JSON file from Downloads to Documents folder

3. **File extensions:** Verify the file has the correct extension (.csv or .json)

4. **Use "All Files":** In the file picker, check if there's an option to show all file types

### Connection refused or timeout

1. **Server running?** Make sure the Python server is still active
2. **Correct port?** Verify you're using the same port number (8000)
3. **Network isolation:** Some routers have AP isolation enabled (prevents devices from seeing each other)
   - Check router settings or try creating a mobile hotspot

## Alternative Methods

### Using ngrok (For testing from anywhere)

If you need to test from a different network:

1. Download [ngrok](https://ngrok.com/)
2. Start your local server (port 8000)
3. Run: `ngrok http 8000`
4. Use the provided ngrok URL on any device

**Note:** Free tier has limitations and requires account signup

### Using a USB Cable

Some browsers support USB debugging:

1. Enable Developer Options on Android
2. Enable USB Debugging
3. Connect via USB
4. Use Chrome's Remote Devices feature
5. Access `localhost:8000` through the forwarded connection

## Quick Reference Commands

```powershell
# Start server
cd c:\Data\Meeplewood
python -m http.server 8000

# Find IP address
ipconfig | findstr /i "IPv4"

# Stop server
Ctrl + C
```

## Notes

- **Port 8000** is the default, but you can use any available port
- Changes to HTML/CSS/JS are reflected immediately (just refresh the page)
- The server shows access logs, helpful for debugging
- Remember to stop the server when done to free up the port
- This method works for any static website, not just Meeplewood

## Security Notice

⚠️ **Only use this method on trusted networks** (home WiFi)
- The server has no authentication
- Anyone on the same network can access your files
- Don't use on public WiFi without additional security measures

---

**Last Updated:** 2026-07-17
