package dev.critter.tray;

import java.awt.AWTException;
import java.awt.Button;
import java.awt.CheckboxMenuItem;
import java.awt.Dialog;
import java.awt.EventQueue;
import java.awt.FlowLayout;
import java.awt.Frame;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.Label;
import java.awt.MenuItem;
import java.awt.Panel;
import java.awt.PopupMenu;
import java.awt.SystemTray;
import java.awt.TextField;
import java.awt.TrayIcon;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.prefs.Preferences;
import javax.imageio.ImageIO;

public final class DevCritterTray {
    private static final String STATUS_PREFERENCE = "status";
    private static final String API_URL_PREFERENCE = "DEV_CRITTER_URL";
    private static final String STATUS_TOKEN_PREFERENCE = "STATUS_TOKEN";
    private static final Preferences PREFERENCES =
            Preferences.userNodeForPackage(DevCritterTray.class);
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private static Status currentStatus;
    private static Status pendingStatus;
    private static boolean updateInProgress;

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
            currentStatus = Status.restore(
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
                    if (updateInProgress) {
                        setSelectedStatus(statusItems, pendingStatus);
                        return;
                    }

                    if (!item.getState() || status == currentStatus) {
                        setSelectedStatus(statusItems, currentStatus);
                        return;
                    }

                    requestStatusUpdate(trayIcon, statusItems, icons, status);
                });
                statusItems.put(status, item);
                menu.add(item);
            }

            menu.addSeparator();
            MenuItem settingsItem = new MenuItem("Settings...");
            settingsItem.addActionListener(event -> showSettingsDialog());
            menu.add(settingsItem);

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

    private static void requestStatusUpdate(
            TrayIcon trayIcon,
            Map<Status, CheckboxMenuItem> statusItems,
            Map<Status, Image> icons,
            Status selectedStatus) {
        pendingStatus = selectedStatus;
        updateInProgress = true;
        setSelectedStatus(statusItems, selectedStatus);
        setOtherStatusItemsEnabled(statusItems, selectedStatus, false);

        String apiUrl = PREFERENCES.get(API_URL_PREFERENCE, "");
        if (apiUrl.isBlank()) {
            failStatusUpdate(
                    trayIcon,
                    statusItems,
                    "Server URL is not configured. Open Settings to configure it.");
            return;
        }

        String statusToken = PREFERENCES.get(STATUS_TOKEN_PREFERENCE, "");
        if (statusToken.isBlank()) {
            failStatusUpdate(
                    trayIcon,
                    statusItems,
                    "Status token is not configured. Open Settings to configure it.");
            return;
        }

        HttpRequest request;
        try {
            URI statusUri = URI.create(apiUrl).resolve("/api/status");
            request = HttpRequest.newBuilder(statusUri)
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + statusToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            "{\"status\":\"" + selectedStatus.value + "\"}"))
                    .build();
        } catch (IllegalArgumentException error) {
            failStatusUpdate(
                    trayIcon,
                    statusItems,
                    "Server URL is invalid. Open Settings to configure a valid deployment URL.");
            return;
        }

        HTTP_CLIENT.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                .whenComplete((response, error) -> EventQueue.invokeLater(() -> {
                    if (error != null) {
                        failStatusUpdate(
                                trayIcon,
                                statusItems,
                                "Could not connect to the configured Server URL.");
                    } else if (response.statusCode() == 401) {
                        failStatusUpdate(
                                trayIcon,
                                statusItems,
                                "Authentication failed. Check Status token in Settings.");
                    } else if (response.statusCode() < 200 || response.statusCode() >= 300) {
                        failStatusUpdate(
                                trayIcon,
                                statusItems,
                                "Status update failed with HTTP " + response.statusCode() + ".");
                    } else {
                        applyStatus(trayIcon, statusItems, icons, selectedStatus);
                        finishStatusUpdate(statusItems);
                    }
                }));
    }

    private static void showSettingsDialog() {
        Dialog dialog = new Dialog((Frame) null, "Dev Critter Settings", true);
        dialog.setLayout(new GridLayout(3, 1, 8, 8));

        TextField apiUrlField = new TextField(
                PREFERENCES.get(API_URL_PREFERENCE, ""), 32);
        TextField statusTokenField = new TextField(
                PREFERENCES.get(STATUS_TOKEN_PREFERENCE, ""), 32);
        statusTokenField.setEchoChar('*');

        Panel apiUrlRow = new Panel(new FlowLayout(FlowLayout.RIGHT));
        apiUrlRow.add(new Label("Server URL"));
        apiUrlRow.add(apiUrlField);
        dialog.add(apiUrlRow);

        Panel statusTokenRow = new Panel(new FlowLayout(FlowLayout.RIGHT));
        statusTokenRow.add(new Label("Status token"));
        statusTokenRow.add(statusTokenField);
        dialog.add(statusTokenRow);

        Panel actions = new Panel(new FlowLayout(FlowLayout.RIGHT));
        Button cancelButton = new Button("Cancel");
        cancelButton.addActionListener(event -> dialog.dispose());
        actions.add(cancelButton);

        Button saveButton = new Button("Save");
        saveButton.addActionListener(event -> {
            PREFERENCES.put(API_URL_PREFERENCE, apiUrlField.getText().trim());
            PREFERENCES.put(STATUS_TOKEN_PREFERENCE, statusTokenField.getText().trim());
            dialog.dispose();
        });
        actions.add(saveButton);
        dialog.add(actions);

        dialog.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent event) {
                dialog.dispose();
            }
        });
        dialog.pack();
        dialog.setLocationRelativeTo(null);
        dialog.setVisible(true);
    }

    private static void applyStatus(
            TrayIcon trayIcon,
            Map<Status, CheckboxMenuItem> statusItems,
            Map<Status, Image> icons,
            Status selectedStatus) {
        currentStatus = selectedStatus;
        setSelectedStatus(statusItems, selectedStatus);

        trayIcon.setImage(icons.get(selectedStatus));
        trayIcon.setToolTip(tooltip(selectedStatus));
        PREFERENCES.put(STATUS_PREFERENCE, selectedStatus.value);
    }

    private static void setSelectedStatus(
            Map<Status, CheckboxMenuItem> statusItems,
            Status selectedStatus) {
        for (Map.Entry<Status, CheckboxMenuItem> entry : statusItems.entrySet()) {
            entry.getValue().setState(entry.getKey() == selectedStatus);
        }
    }

    private static void setOtherStatusItemsEnabled(
            Map<Status, CheckboxMenuItem> statusItems,
            Status selectedStatus,
            boolean enabled) {
        for (Map.Entry<Status, CheckboxMenuItem> entry : statusItems.entrySet()) {
            if (entry.getKey() != selectedStatus) {
                entry.getValue().setEnabled(enabled);
            }
        }
    }

    private static void failStatusUpdate(
            TrayIcon trayIcon,
            Map<Status, CheckboxMenuItem> statusItems,
            String message) {
        setSelectedStatus(statusItems, currentStatus);
        trayIcon.displayMessage(
                "Dev Critter status update failed",
                message,
                TrayIcon.MessageType.ERROR);
        finishStatusUpdate(statusItems);
    }

    private static void finishStatusUpdate(Map<Status, CheckboxMenuItem> statusItems) {
        for (CheckboxMenuItem item : statusItems.values()) {
            item.setEnabled(true);
        }
        pendingStatus = null;
        updateInProgress = false;
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
