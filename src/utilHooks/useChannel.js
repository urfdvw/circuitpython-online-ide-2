export default function useChannel() {
    const queryParams = new URLSearchParams(window.location.search);
    const channel = queryParams.get("channel"); // Retrieve the value of a specific query parameter
    const showDevFeatures = channel === "dev";
    const showBetaFeatures = channel === "dev" || channel === "beta"; // beta level feature shows in dev and beta channel
    return { showDevFeatures, showBetaFeatures };
}
