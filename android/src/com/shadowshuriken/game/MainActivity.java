package com.shadowshuriken.game;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

// 게임(HTML)을 전체 화면 WebView 로 띄운다.
// 켤 때마다 GitHub 에서 최신 게임 파일을 받아 실행하고(실시간 업데이트), 받은 게임과 그림은 폰에 저장해 둔다.
// 인터넷이 안 되면 마지막으로 받은 버전(+저장해 둔 그림)으로 실행하고, 한 번도 받은 적이 없을 때만 앱에 들어 있는 버전을 쓴다.
// 어느 경우든 같은 주소(BASE)로 열어서 저장 기록(localStorage)이 하나로 유지된다.
public class MainActivity extends Activity {
    static final String BASE = "https://raw.githubusercontent.com/smin7752-ops/-/claude/back-view-throwing-game-twma05/public/ninja/";
    private WebView web;
    private volatile boolean online = true;
    private String ua = null;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(11, 10, 23));
        getWindow().getDecorView().setBackgroundColor(Color.rgb(11, 10, 23));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        try { ua = s.getUserAgentString(); } catch (Exception e) {}
        web.setWebViewClient(new WebViewClient() {
            // 그림·글꼴: 인터넷이 되면 받아서 폰에 저장하고 보여 주고, 안 되면 저장해 둔 것을 보여 준다
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, String url) {
                if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return null;
                File f = cacheFile(url);
                byte[] data = online ? fetch(url) : null;
                if (data != null) save(f, data);
                else if (f.exists()) data = readFile(f);
                if (data == null) return null;
                return new WebResourceResponse(mime(url), null, new ByteArrayInputStream(data));
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE);
        setContentView(web);
        String splash;
        try { splash = read(getAssets().open("splash.html")); } catch (Exception e) { splash = "<body style='margin:0;background:#0b0a17'></body>"; }
        web.loadDataWithBaseURL(BASE, splash, "text/html", "utf-8", null);   // 게임 로딩 화면과 같은 그림
        new Thread(new Runnable() {
            public void run() {
                String html = download(BASE + "index.html?t=" + System.currentTimeMillis());
                File last = new File(getFilesDir(), "last_index.html");
                if (html != null && html.indexOf("닌자 키우기") >= 0) {
                    try { save(last, html.getBytes("UTF-8")); } catch (Exception e) {}
                } else {
                    online = false;   // 인터넷 안 됨: 저장해 둔 최신 버전으로
                    html = null;
                    if (last.exists()) { try { html = new String(readFile(last), "UTF-8"); } catch (Exception e) {} }
                    if (html == null || html.indexOf("닌자 키우기") < 0) html = bundled();
                }
                final String page = html;
                runOnUiThread(new Runnable() {
                    public void run() { web.loadDataWithBaseURL(BASE, page, "text/html", "utf-8", null); }
                });
            }
        }).start();
    }

    private String download(String u) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setConnectTimeout(4000);
            c.setReadTimeout(8000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            return read(c.getInputStream());
        } catch (Exception e) {
            return null;
        }
    }

    private byte[] fetch(String u) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setConnectTimeout(5000);
            c.setReadTimeout(15000);
            if (ua != null) c.setRequestProperty("User-Agent", ua);   // 글꼴 주소가 WebView 와 같은 형식으로 오게
            if (c.getResponseCode() != 200) return null;
            InputStream in = c.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            return out.toByteArray();
        } catch (Exception e) {
            return null;
        }
    }

    private File cacheFile(String url) {
        File dir = new File(getFilesDir(), "web");
        if (!dir.exists()) dir.mkdirs();
        String key;
        try {
            byte[] h = MessageDigest.getInstance("SHA-1").digest(url.getBytes("UTF-8"));
            StringBuilder b = new StringBuilder();
            for (byte x : h) b.append(String.format("%02x", x));
            key = b.toString();
        } catch (Exception e) { key = String.valueOf(url.hashCode()); }
        return new File(dir, key);
    }

    private static void save(File f, byte[] data) {
        try {
            File tmp = new File(f.getPath() + ".tmp");
            FileOutputStream o = new FileOutputStream(tmp);
            o.write(data);
            o.close();
            tmp.renameTo(f);
        } catch (Exception e) {}
    }

    private static byte[] readFile(File f) {
        try {
            FileInputStream in = new FileInputStream(f);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            in.close();
            return out.toByteArray();
        } catch (Exception e) {
            return null;
        }
    }

    private static String mime(String url) {
        String u = url.toLowerCase();
        int q = u.indexOf('?'); if (q >= 0) u = u.substring(0, q);
        if (u.endsWith(".webp")) return "image/webp";
        if (u.endsWith(".png")) return "image/png";
        if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
        if (u.endsWith(".woff2")) return "font/woff2";
        if (u.endsWith(".woff")) return "font/woff";
        if (u.endsWith(".ttf")) return "font/ttf";
        if (u.endsWith(".js")) return "application/javascript";
        if (u.endsWith(".json")) return "application/json";
        if (u.endsWith(".html")) return "text/html";
        if (u.contains("fonts.googleapis.com") || u.endsWith(".css")) return "text/css";
        return "application/octet-stream";
    }

    private String bundled() {
        try { return read(getAssets().open("index.html")); } catch (Exception e) { return "<body>게임 파일을 열 수 없어요.</body>"; }
    }

    private static String read(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toString("UTF-8");
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override public void onBackPressed() { moveTaskToBack(true); }
}
