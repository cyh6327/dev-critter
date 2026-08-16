package dev.critter.tray;

import java.awt.AWTException;
import java.awt.CheckboxMenuItem;
import java.awt.EventQueue;
import java.awt.Image;
import java.awt.MenuItem;
import java.awt.PopupMenu;
import java.awt.SystemTray;
import java.awt.TrayIcon;
import java.io.IOException;
import java.io.InputStream;
import java.util.EnumMap;
import java.util.Map;
import java.util.prefs.Preferences;
import javax.imageio.ImageIO;

public final class DevCritterTray {
    private static final String STATUS_PREFERENCE = "status";
    private static final Preferences PREFERENCES =
            Preferences.userNodeForPackage(DevCritterTray.class);

    private enum Status {
        FOCUS("focus", "Focus", "/dev-critter-tray-focus.png"),
        BREAK("break", "Break", "/dev-critter-tray-break.png"),
        OFFLINE("offline", "Offline", "/dev-critter-tray-offline.png");

        private final String value;
        private final String label;
        private final String iconResource;

        Status(String value, String label, String iconResource) {
            this.value = value;
            this.label = label;
            this.iconResource = iconResource;
        }

        private static Status restore(String value) {
            for (Status status : values()) {
                if (status.value.equals(value)) {
                    return status;
                }
            }

            return OFFLINE;
        }
    }

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
            Status currentStatus = Status.restore(
                    PREFERENCES.get(STATUS_PREFERENCE, Status.OFFLINE.value));
            Map<Status, Image> icons = loadIcons();
            Map<Status, CheckboxMenuItem> statusItems = new EnumMap<>(Status.class);
            PopupMenu menu = new PopupMenu();
            TrayIcon trayIcon = new TrayIcon(
                    icons.get(currentStatus), tooltip(currentStatus), menu);

            for (Status status : Status.values()) {
                CheckboxMenuItem item = new CheckboxMenuItem(
                        status.label, status == currentStatus);
                item.addItemListener(event -> {
                    if (item.getState()) {
                        applyStatus(trayIcon, statusItems, icons, status);
                    } else {
                        item.setState(true);
                    }
                });
                statusItems.put(status, item);
                menu.add(item);
            }

            menu.addSeparator();
            MenuItem exitItem = new MenuItem("Exit");
            exitItem.addActionListener(event -> {
                SystemTray.getSystemTray().remove(trayIcon);
                System.exit(0);
            });
            menu.add(exitItem);

            trayIcon.setImageAutoSize(true);
            SystemTray.getSystemTray().add(trayIcon);
        } catch (AWTException | IOException error) {
            System.err.println("Failed to start Dev Critter tray: " + error.getMessage());
            System.exit(1);
        }
    }

    private static void applyStatus(
            TrayIcon trayIcon,
            Map<Status, CheckboxMenuItem> statusItems,
            Map<Status, Image> icons,
            Status selectedStatus) {
        for (Map.Entry<Status, CheckboxMenuItem> entry : statusItems.entrySet()) {
            entry.getValue().setState(entry.getKey() == selectedStatus);
        }

        trayIcon.setImage(icons.get(selectedStatus));
        trayIcon.setToolTip(tooltip(selectedStatus));
        PREFERENCES.put(STATUS_PREFERENCE, selectedStatus.value);
    }

    private static String tooltip(Status status) {
        return "Dev Critter - " + status.label;
    }

    private static Map<Status, Image> loadIcons() throws IOException {
        Map<Status, Image> icons = new EnumMap<>(Status.class);
        for (Status status : Status.values()) {
            icons.put(status, loadIcon(status.iconResource));
        }
        return icons;
    }

    private static Image loadIcon(String resource) throws IOException {
        try (InputStream input = DevCritterTray.class.getResourceAsStream(resource)) {
            if (input == null) {
                throw new IOException("Tray icon resource is missing: " + resource);
            }

            Image image = ImageIO.read(input);
            if (image == null) {
                throw new IOException("Tray icon resource is invalid: " + resource);
            }

            return image;
        }
    }
}
