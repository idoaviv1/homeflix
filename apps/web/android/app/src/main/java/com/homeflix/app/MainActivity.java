package com.homeflix.app;

import android.os.Bundle;
import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebView();
    }

    private void configureWebView() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();

            // Allow multiple windows so JS window.open() succeeds from player scripts
            settings.setSupportMultipleWindows(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Intercept window creation: give calling script a dummy window,
            // so they think it opened in Chrome, but immediately swallow and destroy it!
            webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    try {
                        WebView dummyWebView = new WebView(view.getContext());
                        dummyWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                                // Block external browser launch, swallow ad URL silently
                                return true;
                            }
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                                return true;
                            }
                        });
                        WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                        transport.setWebView(dummyWebView);
                        resultMsg.sendToTarget();

                        // Destroy dummy WebView shortly after absorbing the popup
                        dummyWebView.postDelayed(dummyWebView::destroy, 1500);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }
            });
        }
    }
}
