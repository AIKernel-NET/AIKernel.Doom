namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineDslStatementParser
{
    public static void Parse(string line, DynamicPipelineDslParseState state)
    {
        var current = state.CurrentBlock;
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (current == "aisthesis" && parts is ["sensor", var sensor])
        {
            state.Sensors.Add(sensor);
        }
        else if (current == "phainesis" && parts is ["event", var eventName, "from", var sourceSensor])
        {
            state.Events.Add(new AutoplayPhainesisEventDefinition { Event = eventName, From = sourceSensor });
        }
        else if (current == "nous" && parts is ["vector", var vector, "from", var sourceEvent])
        {
            state.Vectors.Add(new AutoplayNousVectorDefinition { Vector = vector, From = sourceEvent });
        }
        else if (current == "topos" && parts is ["vector", var toposVector])
        {
            state.ToposVectors.Add(toposVector);
        }
        else if (current == "topos" && parts.Length > 1 && parts[0] == "vectors")
        {
            state.ToposVectors.AddRange(parts.Skip(1));
        }
        else if (current == "kairos" && parts is ["priority", var axis])
        {
            state.Priorities.Add(axis);
        }
        else if (current == "kinesis" && parts is ["action", var action])
        {
            state.Actions.Add(action);
        }
        else if (current == "zoe" && parts.Length >= 3 && parts[0] == "veto" && parts[1] == "when")
        {
            state.VetoRules.Add(new AutoplayZoeVetoDefinition { When = string.Join(' ', parts.Skip(2)) });
        }
        else if (current is "detect" or "hodos" or "behavior")
        {
            state.Diagnostics.Add($"{current} {{ ... }} is deprecated; use the 4-layer block structure.");
        }
        else
        {
            state.Diagnostics.Add($"Unrecognized DSL line in '{current}': {line}");
        }
    }
}
