import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { reportsApi } from "../api/reports";
import {
    CreateReportInput,
    ReportCategory,
    ReportVisibility,
} from "../types/report";

const categories: ReportCategory[] = ["CRIME", "SANITATION", "HEALTH"];
const visibilities: ReportVisibility[] = ["PUBLIC", "PRIVATE", "ANONYMOUS"];

export function CreateReportScreen() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ReportCategory>("CRIME");
    const [visibility, setVisibility] = useState<ReportVisibility>("PUBLIC");
    const [image, setImage] = useState<{
        uri: string;
        fileName: string;
        mimeType: string;
    } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const pickImage = async () => {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
            Alert.alert(
                "Permission needed",
                "Please allow access to your photos.",
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.length) {
            const asset = result.assets[0];
            const fileName =
                asset.fileName ??
                asset.uri.split("/").pop() ??
                `report-${Date.now()}.jpg`;
            const mimeType = asset.mimeType ?? "image/jpeg";
            setImage({
                uri: asset.uri,
                fileName,
                mimeType,
            });
        }
    };

    const removeImage = () => {
        setImage(null);
    };

    const submitReport = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert(
                "Missing details",
                "Title and description are required.",
            );
            return;
        }

        try {
            setSubmitting(true);
            let imageUrl: string | undefined;
            if (image) {
                console.log("create-report: uploading image", {
                    uri: image.uri,
                    fileName: image.fileName,
                    mimeType: image.mimeType,
                });
                imageUrl = await reportsApi.uploadReportImage(
                    image.uri,
                    image.fileName,
                    image.mimeType,
                );
            }

            const payload: CreateReportInput = {
                title: title.trim(),
                description: description.trim(),
                category,
                visibility,
                imageUrl,
            };
            await reportsApi.createReport(payload);
            Alert.alert("Report submitted", "Your report has been created.");
            router.back();
        } catch (err) {
            console.error("create-report: submission failed", err);
            Alert.alert("Submission failed", "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Create Report</Text>
                <Text style={styles.subtitle}>
                    Share issues in your area with the city.
                </Text>

                <Pressable onPress={pickImage} style={styles.imagePicker}>
                    {image ? (
                        <Image
                            source={{ uri: image.uri }}
                            style={styles.imagePreview}
                        />
                    ) : (
                        <Text style={styles.imageText}>
                            Add a photo (optional)
                        </Text>
                    )}
                </Pressable>
                {image && (
                    <Pressable
                        onPress={removeImage}
                        style={styles.removeButton}
                    >
                        <Text style={styles.removeText}>Remove photo</Text>
                    </Pressable>
                )}

                <View style={styles.field}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Broken street light"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Describe the issue in detail"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.optionRow}>
                        {categories.map((item) => (
                            <Pressable
                                key={item}
                                onPress={() => setCategory(item)}
                                style={[
                                    styles.option,
                                    category === item && styles.optionSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        category === item &&
                                            styles.optionTextSelected,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Visibility</Text>
                    <View style={styles.optionRow}>
                        {visibilities.map((item) => (
                            <Pressable
                                key={item}
                                onPress={() => setVisibility(item)}
                                style={[
                                    styles.option,
                                    visibility === item &&
                                        styles.optionSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.optionText,
                                        visibility === item &&
                                            styles.optionTextSelected,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={styles.helper}>
                        {visibility === "PUBLIC" && "Visible to everyone."}
                        {visibility === "PRIVATE" &&
                            "Only visible to you and officials."}
                        {visibility === "ANONYMOUS" &&
                            "Visible to public, but anonymous."}
                    </Text>
                </View>

                <Pressable
                    onPress={submitReport}
                    style={[
                        styles.submitButton,
                        submitting && styles.buttonDisabled,
                    ]}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.submitText}>Submit Report</Text>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#0f172a",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: "#64748b",
        marginBottom: 16,
    },
    imagePicker: {
        height: 160,
        backgroundColor: "#e2e8f0",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        overflow: "hidden",
    },
    imageText: {
        color: "#475569",
        fontWeight: "600",
    },
    imagePreview: {
        width: "100%",
        height: "100%",
    },
    removeButton: {
        alignSelf: "flex-start",
        marginTop: -6,
        marginBottom: 16,
    },
    removeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#b91c1c",
    },
    field: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#0f172a",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        fontSize: 14,
        color: "#0f172a",
    },
    textArea: {
        height: 120,
        textAlignVertical: "top",
    },
    optionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    option: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        backgroundColor: "#ffffff",
        marginRight: 8,
        marginBottom: 8,
    },
    optionSelected: {
        borderColor: "#0f766e",
        backgroundColor: "#ccfbf1",
    },
    optionText: {
        fontSize: 12,
        color: "#475569",
        fontWeight: "600",
    },
    optionTextSelected: {
        color: "#0f766e",
    },
    helper: {
        marginTop: 6,
        fontSize: 12,
        color: "#64748b",
    },
    submitButton: {
        backgroundColor: "#0f766e",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 8,
    },
    submitText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "600",
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});
