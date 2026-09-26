package com.shadowshuriken.game;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// 게임(HTML)을 전체 화면 WebView 로 띄운다.
// 켤 때마다 GitHub 에서 최신 게임 파일을 받아 실행하고(실시간 업데이트),
// 인터넷이 안 되면 앱에 들어 있는 버전으로 실행한다.
// 두 경우 모두 같은 주소(BASE)로 열어서 저장 기록(localStorage)이 하나로 유지된다.
public class MainActivity extends Activity {
    static final String BASE = "https://raw.githubusercontent.com/smin7752-ops/-/claude/back-view-throwing-game-twma05/public/ninja/";
    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(20, 17, 27));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE);
        setContentView(web);
        web.loadDataWithBaseURL(BASE, "<body style='margin:0;background:#14111b;color:#b9a58c;font:20px sans-serif;display:grid;place-items:center;height:100vh'>최신 버전 확인 중…</body>", "text/html", "utf-8", null);
        new Thread(new Runnable() {
            public void run() {
                String html = download(BASE + "index.html?t=" + System.currentTimeMillis());
                if (html == null || html.indexOf("그림자 수리검") < 0) html = bundled();
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
            c.setConnectTimeout(5000);
            c.setReadTimeout(8000);
            c.setUseCaches(false);
            if (c.getResponseCode() != 200) return null;
            return read(c.getInputStream());
        } catch (Exception e) {
            return null;
        }
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
