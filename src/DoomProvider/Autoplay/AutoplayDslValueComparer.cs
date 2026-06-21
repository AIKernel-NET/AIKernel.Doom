namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayDslValueComparer
{
    public static bool Compare(AutoplayDslValue left, AutoplayDslValue right, string op)
    {
        if (left.Kind == AutoplayDslValueKind.Text || right.Kind == AutoplayDslValueKind.Text)
        {
            var comparison = string.Equals(left.AsText(), right.AsText(), StringComparison.OrdinalIgnoreCase);
            return op switch
            {
                "==" => comparison,
                "!=" => !comparison,
                _ => false
            };
        }

        if (left.Kind == AutoplayDslValueKind.Boolean || right.Kind == AutoplayDslValueKind.Boolean)
        {
            var comparison = left.AsBoolean() == right.AsBoolean();
            return op switch
            {
                "==" => comparison,
                "!=" => !comparison,
                _ => false
            };
        }

        var leftNumber = left.AsNumber();
        var rightNumber = right.AsNumber();
        return op switch
        {
            ">=" => leftNumber >= rightNumber,
            "<=" => leftNumber <= rightNumber,
            "==" => Math.Abs(leftNumber - rightNumber) <= 0.0001f,
            "!=" => Math.Abs(leftNumber - rightNumber) > 0.0001f,
            ">" => leftNumber > rightNumber,
            "<" => leftNumber < rightNumber,
            _ => false
        };
    }
}
