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
    /// <summary>
    /// [EN] Executes the <c>Number</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Number</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="value">
    /// [EN] Supplies the <c>value</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>value</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayDslValue Number(float value)
        => new(AutoplayDslValueKind.Number, value, Math.Abs(value) > 0.0001f, string.Empty);

    /// <summary>
    /// [EN] Executes the <c>Boolean</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Boolean</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="value">
    /// [EN] Supplies the <c>value</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>value</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayDslValue Boolean(bool value)
        => new(AutoplayDslValueKind.Boolean, value ? 1 : 0, value, value ? "true" : "false");

    /// <summary>
    /// [EN] Executes the <c>Text</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Text</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="value">
    /// [EN] Supplies the <c>value</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>value</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayDslValue Text(string value)
        => new(AutoplayDslValueKind.Text, 0, !string.IsNullOrWhiteSpace(value), value);

    /// <summary>
    /// [EN] Executes the <c>AsNumber</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>AsNumber</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public float AsNumber()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue ? 1 : 0,
            AutoplayDslValueKind.Number => NumberValue,
            _ => 0
        };

    /// <summary>
    /// [EN] Executes the <c>AsBoolean</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>AsBoolean</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool AsBoolean()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue,
            AutoplayDslValueKind.Number => Math.Abs(NumberValue) > 0.0001f,
            _ => !string.IsNullOrWhiteSpace(TextValue)
        };

    /// <summary>
    /// [EN] Executes the <c>AsText</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>AsText</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public string AsText()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue ? "true" : "false",
            AutoplayDslValueKind.Number => NumberValue.ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => TextValue
        };
}
