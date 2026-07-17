namespace AIKernel.Doom.Architecture.Tests;

using AIKernel.Doom.Provider.Autoplay;

public sealed class E1M1ContinuationRouteGeometryTests
{
    private const int TwoSidedFlag = 0x0004;
    private const int LowerUnpeggedFlag = 0x0008;
    private const int ImpDoomEdType = 3001;
    private const int AllSkillsAndAmbushFlags = 15;

    // Frozen LINEDEF fixtures from the canonical E1M1 WAD. These are kept in
    // the test assembly so product code never needs a WAD/BSP parser.
    private static readonly Linedef[] ExitRouteLinedefs =
    [
        new(324, new(2976d, -4648d), new(3040d, -4648d),
            Flags: 4, Special: 1, RightSector: 84, LeftSector: 81),
        new(325, new(3040d, -4632d), new(2976d, -4632d),
            Flags: 4, Special: 1, RightSector: 80, LeftSector: 81),
        new(330, new(2912d, -4800d), new(2912d, -4736d),
            Flags: 17, Special: 11, RightSector: 82, LeftSector: null),
        new(333, new(2976d, -4672d), new(3040d, -4672d),
            Flags: 12, Special: 0, RightSector: 82, LeftSector: 84),
        new(342, new(3024d, -4592d), new(2992d, -4592d),
            Flags: 4, Special: 0, RightSector: 78, LeftSector: 79),
        new(343, new(2992d, -4600d), new(3024d, -4600d),
            Flags: 4, Special: 0, RightSector: 78, LeftSector: 79),
        new(344, new(3024d, -4600d), new(3024d, -4592d),
            Flags: 4, Special: 0, RightSector: 78, LeftSector: 79),
        new(345, new(2992d, -4592d), new(2992d, -4600d),
            Flags: 4, Special: 0, RightSector: 78, LeftSector: 79),
        new(346, new(3040d, -4608d), new(2976d, -4608d),
            Flags: 12, Special: 0, RightSector: 78, LeftSector: 80)
    ];

    private static readonly Sector[] ExitRouteSectors =
    [
        new(78, FloorHeight: -24, CeilingHeight: 72, "FLOOR5_2", "CEIL3_5"),
        new(79, FloorHeight: -24, CeilingHeight: 56, "FLOOR5_2", "FLAT23"),
        new(80, FloorHeight: -24, CeilingHeight: 48, "FLOOR5_2", "CEIL3_5"),
        new(81, FloorHeight: -24, CeilingHeight: -24, "FLOOR5_2", "FLAT20"),
        new(82, FloorHeight: -24, CeilingHeight: 88, "FLOOR5_2", "TLITE6_5"),
        new(84, FloorHeight: -24, CeilingHeight: 48, "FLOOR5_2", "CEIL3_5")
    ];

    private static readonly WadThing CanonicalGatekeeper = new(
        ThingIndex: 16,
        Position: new Point(3008d, -4416d),
        AngleDegrees: 90,
        DoomEdType: ImpDoomEdType,
        Flags: AllSkillsAndAmbushFlags);

    // Nodes 221-226 and subsectors 224-230 are the frozen local BSP branch
    // used by the x=3008 exit-lane centerline. Child ordering and the exact
    // horizontal-boundary tie break are significant to native sector facts.
    private static readonly IReadOnlyDictionary<int, BspNode> LocalExitBspNodes
        = new Dictionary<int, BspNode>
        {
            [221] = new(
                221,
                new Point(2992d, -4592d),
                new Point(0d, -8d),
                Subsector(227),
                Subsector(228)),
            [222] = new(
                222,
                new Point(3024d, -4592d),
                new Point(-32d, 0d),
                Subsector(226),
                Node(221)),
            [223] = new(
                223,
                new Point(3024d, -4600d),
                new Point(0d, 8d),
                Subsector(225),
                Node(222)),
            [224] = new(
                224,
                new Point(2992d, -4600d),
                new Point(32d, 0d),
                Subsector(224),
                Node(223)),
            [225] = new(
                225,
                new Point(3040d, -4632d),
                new Point(-64d, 0d),
                Subsector(229),
                Subsector(230)),
            [226] = new(
                226,
                new Point(3072d, -4608d),
                new Point(-32d, 0d),
                Node(224),
                Node(225))
        };

    private static readonly IReadOnlyDictionary<int, int> LocalSubsectorSectors
        = new Dictionary<int, int>
        {
            [224] = 78,
            [225] = 78,
            [226] = 78,
            [227] = 78,
            [228] = 79,
            [229] = 80,
            [230] = 81
        };

    [Fact]
    public void PinnedExitLaneInsert_HasExactTopologyAndRouteCrossings()
    {
        var policy = new E1M1ContinuationPolicy();
        var insert = new[] { Line(342), Line(343), Line(344), Line(345) };
        var sector78 = SectorFixture(78);
        var sector79 = SectorFixture(79);
        var routeLeg = new Segment(
            PointOf(policy.Waypoints[11]),
            PointOf(policy.Waypoints[12]));

        Assert.All(insert, line =>
        {
            Assert.Equal(TwoSidedFlag, line.Flags);
            Assert.Equal(0, line.Special);
            Assert.Equal(78, line.RightSector);
            Assert.Equal(79, line.LeftSector);
        });

        var vertices = insert.SelectMany(line => new[] { line.A, line.B }).ToArray();
        Assert.Equal(32d, vertices.Max(point => point.X) - vertices.Min(point => point.X));
        Assert.Equal(8d, vertices.Max(point => point.Y) - vertices.Min(point => point.Y));
        Assert.Equal(32d, Distance(Line(342).A, Line(342).B));
        Assert.Equal(32d, Distance(Line(343).A, Line(343).B));
        Assert.Equal(8d, Distance(Line(344).A, Line(344).B));
        Assert.Equal(8d, Distance(Line(345).A, Line(345).B));

        Assert.Equal(sector78.FloorHeight, sector79.FloorHeight);
        Assert.Equal(80, sector79.OpenHeight);
        Assert.Equal(16, sector78.CeilingHeight - sector79.CeilingHeight);
        Assert.Equal("FLOOR5_2", sector79.FloorTexture);
        Assert.Equal("FLAT23", sector79.CeilingTexture);

        AssertIntersection(routeLeg, Line(342).Segment, new Point(3008d, -4592d));
        AssertIntersection(routeLeg, Line(343).Segment, new Point(3008d, -4600d));
        AssertIntersection(routeLeg, Line(346).Segment, new Point(3008d, -4608d));
        Assert.DoesNotContain(
            new[] { Line(344), Line(345) },
            line => Intersects(routeLeg, line.Segment));

        Assert.Equal(new[] { 79, 80 }, Neighbors(78, insert.Append(Line(346))));
        Assert.Equal(new[] { 78 }, Neighbors(79, insert.Append(Line(346))));
        Assert.DoesNotContain(80, Neighbors(79, insert.Append(Line(346))));
        Assert.Equal(78, Line(346).RightSector);
        Assert.Equal(80, Line(346).LeftSector);
        Assert.Equal(TwoSidedFlag | LowerUnpeggedFlag, Line(346).Flags);
    }

    [Fact]
    public void PinnedLocalBsp_ClassifiesEveryExitLaneCenterlineBoundary()
    {
        var policy = new E1M1ContinuationPolicy();

        Assert.Equal(78, ClassifyLocalExitSector(new Point(3008d, -4591d)));
        for (var y = -4592; y >= -4599; y--)
        {
            Assert.Equal(79, ClassifyLocalExitSector(new Point(3008d, y)));
        }

        for (var y = -4600; y >= -4607; y--)
        {
            Assert.Equal(78, ClassifyLocalExitSector(new Point(3008d, y)));
        }

        Assert.Equal(80, ClassifyLocalExitSector(new Point(3008d, -4608d)));
        Assert.Equal(78, ClassifyLocalExitSector(PointOf(policy.Waypoints[11])));
        Assert.Equal(80, ClassifyLocalExitSector(PointOf(policy.Waypoints[12])));

        // The exact boundary assignments depend on Doom's axial-node <=
        // branches. A generic cross-product equality rule would classify
        // y=-4600 on the wrong side of node 224.
        Assert.Equal(1, PointOnSide(new Point(3008d, -4592d), LocalExitBspNodes[222]));
        Assert.Equal(0, PointOnSide(new Point(3008d, -4600d), LocalExitBspNodes[224]));
        Assert.Equal(1, PointOnSide(new Point(3008d, -4608d), LocalExitBspNodes[226]));
    }

    [Fact]
    public void ExitDoorAndSwitchRays_HitPinnedActionableFrontSides()
    {
        var policy = new E1M1ContinuationPolicy();
        var nearDoorFace = Line(325);
        var farDoorFace = Line(324);
        var exitRoomPortal = Line(333);
        var exitSwitch = Line(330);
        var doorContact = PointOf(policy.Waypoints[12]);
        var doorAim = new Point(3008d, -4624d);
        var nearFaceCenter = Midpoint(nearDoorFace.Segment);
        var doorTraversal = new Segment(
            doorContact,
            PointOf(policy.Waypoints[13]));
        var exitRoomEntry = new Segment(
            PointOf(policy.Waypoints[13]),
            PointOf(policy.Waypoints[14]));
        var switchApproach = PointOf(policy.Waypoints[15]);
        var switchTarget = Midpoint(exitSwitch.Segment);
        var switchRay = new Segment(switchApproach, switchTarget);

        AssertLinedef(nearDoorFace, flags: 4, special: 1, rightSector: 80, leftSector: 81);
        AssertLinedef(farDoorFace, flags: 4, special: 1, rightSector: 84, leftSector: 81);
        AssertLinedef(exitRoomPortal, flags: 12, special: 0, rightSector: 82, leftSector: 84);
        AssertLinedef(exitSwitch, flags: 17, special: 11, rightSector: 82, leftSector: null);

        Assert.Equal(E1M1ContinuationNavigator.CanonicalPlayerRadius,
            Distance(doorContact, nearFaceCenter));
        Assert.Equal(8d, Distance(doorContact, doorAim));
        Assert.Equal(8d, Distance(doorAim, nearFaceCenter));
        Assert.Equal(0d, PointToSegmentDistance(doorAim, new Segment(doorContact, nearFaceCenter)));
        Assert.True(SignedSide(nearDoorFace.Segment, doorContact) < 0d);
        Assert.True(SignedSide(nearDoorFace.Segment, doorAim) < 0d);
        Assert.Equal(0d, SignedSide(nearDoorFace.Segment, nearFaceCenter));
        Assert.Equal(32d, EndpointClearance(nearFaceCenter, nearDoorFace.Segment));

        AssertIntersection(doorTraversal, nearDoorFace.Segment, new Point(3008d, -4632d));
        AssertIntersection(doorTraversal, farDoorFace.Segment, new Point(3008d, -4648d));
        AssertIntersection(exitRoomEntry, exitRoomPortal.Segment, new Point(3008d, -4672d));

        Assert.Equal(new Point(2912d, -4768d), switchTarget);
        Assert.Equal(32d, Distance(switchApproach, switchTarget));
        Assert.True(Distance(switchApproach, switchTarget) <= policy.UseMaximumDistance);
        Assert.True(SignedSide(exitSwitch.Segment, switchApproach) < 0d);
        Assert.Equal(0d, SignedSide(exitSwitch.Segment, switchTarget));
        AssertIntersection(switchRay, exitSwitch.Segment, switchTarget);
        Assert.Equal(32d, EndpointClearance(switchTarget, exitSwitch.Segment));
    }

    [Fact]
    public void CanonicalGatekeeperThing_IsPinnedAllSkillImpNotRuntimeTypeNumber()
    {
        var policy = new E1M1ContinuationPolicy();
        var gatekeeperApproach = PointOf(policy.Waypoints[9]);

        Assert.Equal(
            "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771",
            FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256);
        Assert.Equal(16, CanonicalGatekeeper.ThingIndex);
        Assert.Equal(new Point(3008d, -4416d), CanonicalGatekeeper.Position);
        Assert.Equal(90, CanonicalGatekeeper.AngleDegrees);
        Assert.Equal(ImpDoomEdType, CanonicalGatekeeper.DoomEdType);
        Assert.Equal(AllSkillsAndAmbushFlags, CanonicalGatekeeper.Flags);
        Assert.Equal(0x7, CanonicalGatekeeper.Flags & 0x7);
        Assert.Equal(0x8, CanonicalGatekeeper.Flags & 0x8);

        Assert.Equal(E1M1ContinuationNavigator.GatekeeperSpawnX, CanonicalGatekeeper.Position.X);
        Assert.Equal(E1M1ContinuationNavigator.GatekeeperSpawnY, CanonicalGatekeeper.Position.Y);
        Assert.Equal(74, E1M1ContinuationNavigator.GatekeeperSectorIndex);
        Assert.Equal(11, E1M1ContinuationNavigator.GatekeeperRuntimeType);
        Assert.NotEqual(E1M1ContinuationNavigator.GatekeeperRuntimeType, CanonicalGatekeeper.DoomEdType);
        Assert.Equal(E1M1ContinuationNavigator.CanonicalPlayerRadius,
            Distance(gatekeeperApproach, CanonicalGatekeeper.Position));
    }

    private static Linedef Line(int index)
        => Assert.Single(ExitRouteLinedefs, line => line.Index == index);

    private static Sector SectorFixture(int index)
        => Assert.Single(ExitRouteSectors, sector => sector.Index == index);

    private static Point PointOf(E1M1ContinuationWaypoint waypoint)
        => new(waypoint.X, waypoint.Y);

    private static int[] Neighbors(int sector, IEnumerable<Linedef> lines)
        => lines
            .Where(line => line.LeftSector.HasValue
                && (line.RightSector == sector || line.LeftSector == sector))
            .Select(line => line.RightSector == sector
                ? line.LeftSector!.Value
                : line.RightSector)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

    private static int ClassifyLocalExitSector(Point point)
    {
        var child = Node(226);
        while (!child.IsSubsector)
        {
            var node = LocalExitBspNodes[child.Index];
            child = PointOnSide(point, node) == 0 ? node.Child0 : node.Child1;
        }

        return LocalSubsectorSectors[child.Index];
    }

    private static int PointOnSide(Point point, BspNode node)
    {
        if (node.Delta.X == 0d)
        {
            return point.X <= node.Origin.X
                ? node.Delta.Y > 0d ? 1 : 0
                : node.Delta.Y < 0d ? 1 : 0;
        }

        if (node.Delta.Y == 0d)
        {
            return point.Y <= node.Origin.Y
                ? node.Delta.X < 0d ? 1 : 0
                : node.Delta.X > 0d ? 1 : 0;
        }

        var left = node.Delta.Y * (point.X - node.Origin.X);
        var right = (point.Y - node.Origin.Y) * node.Delta.X;
        return right < left ? 0 : 1;
    }

    private static BspChild Node(int index) => new(false, index);

    private static BspChild Subsector(int index) => new(true, index);

    private static void AssertLinedef(
        Linedef line,
        int flags,
        int special,
        int rightSector,
        int? leftSector)
    {
        Assert.Equal(flags, line.Flags);
        Assert.Equal(special, line.Special);
        Assert.Equal(rightSector, line.RightSector);
        Assert.Equal(leftSector, line.LeftSector);
    }

    private static void AssertIntersection(
        Segment route,
        Segment linedef,
        Point expected)
    {
        Assert.True(TryIntersection(route, linedef, out var actual));
        Assert.Equal(expected.X, actual.X, precision: 8);
        Assert.Equal(expected.Y, actual.Y, precision: 8);
    }

    private static bool Intersects(Segment first, Segment second)
        => TryIntersection(first, second, out _);

    private static bool TryIntersection(Segment first, Segment second, out Point intersection)
    {
        var firstVector = first.B - first.A;
        var secondVector = second.B - second.A;
        var offset = second.A - first.A;
        var denominator = Cross(firstVector, secondVector);
        if (Math.Abs(denominator) <= 1e-12d)
        {
            intersection = default;
            return false;
        }

        var firstParameter = Cross(offset, secondVector) / denominator;
        var secondParameter = Cross(offset, firstVector) / denominator;
        if (firstParameter < 0d
            || firstParameter > 1d
            || secondParameter < 0d
            || secondParameter > 1d)
        {
            intersection = default;
            return false;
        }

        intersection = first.A + (firstVector * firstParameter);
        return true;
    }

    private static double PointToSegmentDistance(Point point, Segment segment)
    {
        var delta = segment.B - segment.A;
        var lengthSquared = (delta.X * delta.X) + (delta.Y * delta.Y);
        var parameter = lengthSquared == 0d
            ? 0d
            : Math.Clamp(
                (((point.X - segment.A.X) * delta.X)
                    + ((point.Y - segment.A.Y) * delta.Y)) / lengthSquared,
                0d,
                1d);
        return Distance(point, segment.A + (delta * parameter));
    }

    private static double EndpointClearance(Point point, Segment segment)
        => Math.Min(Distance(point, segment.A), Distance(point, segment.B));

    private static Point Midpoint(Segment segment)
        => new((segment.A.X + segment.B.X) / 2d, (segment.A.Y + segment.B.Y) / 2d);

    private static double SignedSide(Segment segment, Point point)
        => Cross(segment.B - segment.A, point - segment.A);

    private static double Cross(Point left, Point right)
        => (left.X * right.Y) - (left.Y * right.X);

    private static double Distance(Point left, Point right)
    {
        var delta = left - right;
        return Math.Sqrt((delta.X * delta.X) + (delta.Y * delta.Y));
    }

    private readonly record struct Point(double X, double Y)
    {
        public static Point operator +(Point left, Point right)
            => new(left.X + right.X, left.Y + right.Y);

        public static Point operator -(Point left, Point right)
            => new(left.X - right.X, left.Y - right.Y);

        public static Point operator *(Point point, double value)
            => new(point.X * value, point.Y * value);
    }

    private readonly record struct Segment(Point A, Point B);

    private sealed record Linedef(
        int Index,
        Point A,
        Point B,
        int Flags,
        int Special,
        int RightSector,
        int? LeftSector)
    {
        public Segment Segment => new(A, B);
    }

    private sealed record Sector(
        int Index,
        int FloorHeight,
        int CeilingHeight,
        string FloorTexture,
        string CeilingTexture)
    {
        public int OpenHeight => CeilingHeight - FloorHeight;
    }

    private sealed record WadThing(
        int ThingIndex,
        Point Position,
        int AngleDegrees,
        int DoomEdType,
        int Flags);

    private sealed record BspNode(
        int Index,
        Point Origin,
        Point Delta,
        BspChild Child0,
        BspChild Child1);

    private readonly record struct BspChild(bool IsSubsector, int Index);
}
