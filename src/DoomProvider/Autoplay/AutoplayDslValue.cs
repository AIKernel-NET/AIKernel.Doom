namespace AIKernel.Doom.Provider.Autoplay;

internal enum AutoplayDslValueKind
{
    Number,
    Boolean,
    Text
}

internal readonly record struct AutoplayDslValue(
    AutoplayDslValueKind Kind,
    float NumberValue,
    bool BooleanValue,
    string TextValue)
{
    public static AutoplayDslValue Number(float value)
        => new(AutoplayDslValueKind.Number, value, Math.Abs(value) > 0.0001f, string.Empty);

    public static AutoplayDslValue Boolean(bool value)
        => new(AutoplayDslValueKind.Boolean, value ? 1 : 0, value, value ? "true" : "false");

    public static AutoplayDslValue Text(string value)
        => new(AutoplayDslValueKind.Text, 0, !string.IsNullOrWhiteSpace(value), value);

    public float AsNumber()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue ? 1 : 0,
            AutoplayDslValueKind.Number => NumberValue,
            _ => 0
        };

    public bool AsBoolean()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue,
            AutoplayDslValueKind.Number => Math.Abs(NumberValue) > 0.0001f,
            _ => !string.IsNullOrWhiteSpace(TextValue)
        };

    public string AsText()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue ? "true" : "false",
            AutoplayDslValueKind.Number => NumberValue.ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => TextValue
        };
}
