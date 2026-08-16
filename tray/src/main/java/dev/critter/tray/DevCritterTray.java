package dev.critter.tray;

import java.awt.AWTException;
import java.awt.EventQueue;
import java.awt.Image;
import java.awt.PopupMenu;
import java.awt.SystemTray;
import java.awt.TrayIcon;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;

public final class DevCritterTray {
    private static final String ICON_RESOURCE = "/dev-critter-tray.png";

    private DevCritterTray() {}

    public static void main(String[] args) {
        if (!SystemTray.isSupported()) {
            System.err.println("System tray is not supported.");
            System.exit(1);
        }

        EventQueue.invokeLater(DevCritterTray::start);
    }

    private static void start() {
        try {
            TrayIcon trayIcon = new TrayIcon(loadIcon(), "Dev Critter", new PopupMenu());
            trayIcon.setImageAutoSize(true);
            SystemTray.getSystemTray().add(trayIcon);
        } catch (AWTException | IOException error) {
            System.err.println("Failed to start Dev Critter tray: " + error.getMessage());
            System.exit(1);
        }
    }

    private static Image loadIcon() throws IOException {
        try (InputStream input = DevCritterTray.class.getResourceAsStream(ICON_RESOURCE)) {
            if (input == null) {
                throw new IOException("Tray icon resource is missing.");
            }

            Image image = ImageIO.read(input);
            if (image == null) {
                throw new IOException("Tray icon resource is invalid.");
            }

            return image;
        }
    }
}
