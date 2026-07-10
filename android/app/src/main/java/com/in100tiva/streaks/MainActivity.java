package com.in100tiva.streaks;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Modo imersivo: esconde a barra de navegação do Android para o app
        // ocupar a tela inteira. Um swipe da borda inferior revela a barra
        // temporariamente (BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE) e ela se
        // esconde de novo sozinha. Reaplicado a cada foco (teclado/diálogos).
        if (hasFocus) {
            WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            controller.hide(WindowInsetsCompat.Type.navigationBars());
            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
}
