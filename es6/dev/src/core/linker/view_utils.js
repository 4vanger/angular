import { isBlank, isPresent, CONST_EXPR, looseIdentical } from 'angular2/src/facade/lang';
import { ListWrapper, StringMapWrapper } from 'angular2/src/facade/collection';
import { BaseException } from 'angular2/src/facade/exceptions';
import { AppElement } from './element';
import { ExpressionChangedAfterItHasBeenCheckedException } from './exceptions';
import { devModeEqual } from 'angular2/src/core/change_detection/change_detection';
export function flattenNestedViewRenderNodes(nodes) {
    return _flattenNestedViewRenderNodes(nodes, []);
}
function _flattenNestedViewRenderNodes(nodes, renderNodes) {
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node instanceof AppElement) {
            var appEl = node;
            renderNodes.push(appEl.nativeElement);
            if (isPresent(appEl.nestedViews)) {
                for (var k = 0; k < appEl.nestedViews.length; k++) {
                    _flattenNestedViewRenderNodes(appEl.nestedViews[k].rootNodesOrAppElements, renderNodes);
                }
            }
        }
        else {
            renderNodes.push(node);
        }
    }
    return renderNodes;
}
const EMPTY_ARR = CONST_EXPR([]);
export function ensureSlotCount(projectableNodes, expectedSlotCount) {
    var res;
    if (isBlank(projectableNodes)) {
        res = EMPTY_ARR;
    }
    else if (projectableNodes.length < expectedSlotCount) {
        var givenSlotCount = projectableNodes.length;
        res = ListWrapper.createFixedSize(expectedSlotCount);
        for (var i = 0; i < expectedSlotCount; i++) {
            res[i] = (i < givenSlotCount) ? projectableNodes[i] : EMPTY_ARR;
        }
    }
    else {
        res = projectableNodes;
    }
    return res;
}
export const MAX_INTERPOLATION_VALUES = 9;
export function interpolate(valueCount, c0, a1, c1, a2, c2, a3, c3, a4, c4, a5, c5, a6, c6, a7, c7, a8, c8, a9, c9) {
    switch (valueCount) {
        case 1:
            return c0 + _toStringWithNull(a1) + c1;
        case 2:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2;
        case 3:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3;
        case 4:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3 + _toStringWithNull(a4) + c4;
        case 5:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3 + _toStringWithNull(a4) + c4 + _toStringWithNull(a5) + c5;
        case 6:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3 + _toStringWithNull(a4) + c4 + _toStringWithNull(a5) + c5 + _toStringWithNull(a6) +
                c6;
        case 7:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3 + _toStringWithNull(a4) + c4 + _toStringWithNull(a5) + c5 + _toStringWithNull(a6) +
                c6 + _toStringWithNull(a7) + c7;
        case 8:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3 + _toStringWithNull(a4) + c4 + _toStringWithNull(a5) + c5 + _toStringWithNull(a6) +
                c6 + _toStringWithNull(a7) + c7 + _toStringWithNull(a8) + c8;
        case 9:
            return c0 + _toStringWithNull(a1) + c1 + _toStringWithNull(a2) + c2 + _toStringWithNull(a3) +
                c3 + _toStringWithNull(a4) + c4 + _toStringWithNull(a5) + c5 + _toStringWithNull(a6) +
                c6 + _toStringWithNull(a7) + c7 + _toStringWithNull(a8) + c8 + _toStringWithNull(a9) +
                c9;
        default:
            throw new BaseException(`Does not support more than 9 expressions`);
    }
}
function _toStringWithNull(v) {
    return v != null ? v.toString() : '';
}
export function checkBinding(throwOnChange, oldValue, newValue) {
    if (throwOnChange) {
        if (!devModeEqual(oldValue, newValue)) {
            throw new ExpressionChangedAfterItHasBeenCheckedException(oldValue, newValue, null);
        }
        return false;
    }
    else {
        return !looseIdentical(oldValue, newValue);
    }
}
export function arrayLooseIdentical(a, b) {
    if (a.length != b.length)
        return false;
    for (var i = 0; i < a.length; ++i) {
        if (!looseIdentical(a[i], b[i]))
            return false;
    }
    return true;
}
export function mapLooseIdentical(m1, m2) {
    var k1 = StringMapWrapper.keys(m1);
    var k2 = StringMapWrapper.keys(m2);
    if (k1.length != k2.length) {
        return false;
    }
    var key;
    for (var i = 0; i < k1.length; i++) {
        key = k1[i];
        if (!looseIdentical(m1[key], m2[key])) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld191dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpZmZpbmdfcGx1Z2luX3dyYXBwZXItb3V0cHV0X3BhdGgtNkFoWGUyNkcudG1wL2FuZ3VsYXIyL3NyYy9jb3JlL2xpbmtlci92aWV3X3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJPQUFPLEVBQ0wsT0FBTyxFQUNQLFNBQVMsRUFHVCxVQUFVLEVBQ1YsY0FBYyxFQUNmLE1BQU0sMEJBQTBCO09BQzFCLEVBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFDLE1BQU0sZ0NBQWdDO09BQ3JFLEVBQUMsYUFBYSxFQUFDLE1BQU0sZ0NBQWdDO09BQ3JELEVBQUMsVUFBVSxFQUFDLE1BQU0sV0FBVztPQUM3QixFQUFDLCtDQUErQyxFQUFDLE1BQU0sY0FBYztPQUNyRSxFQUFDLFlBQVksRUFBQyxNQUFNLHFEQUFxRDtBQUVoRiw2Q0FBNkMsS0FBWTtJQUN2RCxNQUFNLENBQUMsNkJBQTZCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFFRCx1Q0FBdUMsS0FBWSxFQUFFLFdBQWtCO0lBQ3JFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3RDLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixFQUFFLENBQUMsQ0FBQyxJQUFJLFlBQVksVUFBVSxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLEtBQUssR0FBZSxJQUFJLENBQUM7WUFDN0IsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDdEMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFH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QUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNaLEVBQUUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc0JsYW5rLFxuICBpc1ByZXNlbnQsXG4gIFR5cGUsXG4gIHN0cmluZ2lmeSxcbiAgQ09OU1RfRVhQUixcbiAgbG9vc2VJZGVudGljYWxcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9sYW5nJztcbmltcG9ydCB7TGlzdFdyYXBwZXIsIFN0cmluZ01hcFdyYXBwZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvY29sbGVjdGlvbic7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5pbXBvcnQge0FwcEVsZW1lbnR9IGZyb20gJy4vZWxlbWVudCc7XG5pbXBvcnQge0V4cHJlc3Npb25DaGFuZ2VkQWZ0ZXJJdEhhc0JlZW5DaGVja2VkRXhjZXB0aW9ufSBmcm9tICcuL2V4Y2VwdGlvbnMnO1xuaW1wb3J0IHtkZXZNb2RlRXF1YWx9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2NoYW5nZV9kZXRlY3Rpb24vY2hhbmdlX2RldGVjdGlvbic7XG5cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuTmVzdGVkVmlld1JlbmRlck5vZGVzKG5vZGVzOiBhbnlbXSk6IGFueVtdIHtcbiAgcmV0dXJuIF9mbGF0dGVuTmVzdGVkVmlld1JlbmRlck5vZGVzKG5vZGVzLCBbXSk7XG59XG5cbmZ1bmN0aW9uIF9mbGF0dGVuTmVzdGVkVmlld1JlbmRlck5vZGVzKG5vZGVzOiBhbnlbXSwgcmVuZGVyTm9kZXM6IGFueVtdKTogYW55W10ge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICBpZiAobm9kZSBpbnN0YW5jZW9mIEFwcEVsZW1lbnQpIHtcbiAgICAgIHZhciBhcHBFbCA9IDxBcHBFbGVtZW50Pm5vZGU7XG4gICAgICByZW5kZXJOb2Rlcy5wdXNoKGFwcEVsLm5hdGl2ZUVsZW1lbnQpO1xuICAgICAgaWYgKGlzUHJlc2VudChhcHBFbC5uZXN0ZWRWaWV3cykpIHtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBhcHBFbC5uZXN0ZWRWaWV3cy5sZW5ndGg7IGsrKykge1xuICAgICAgICAgIF9mbGF0dGVuTmVzdGVkVmlld1JlbmRlck5vZGVzKGFwcEVsLm5lc3RlZFZpZXdzW2tdLnJvb3ROb2Rlc09yQXBwRWxlbWVudHMsIHJlbmRlck5vZGVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZW5kZXJOb2Rlcy5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVuZGVyTm9kZXM7XG59XG5cbmNvbnN0IEVNUFRZX0FSUiA9IENPTlNUX0VYUFIoW10pO1xuXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2xvdENvdW50KHByb2plY3RhYmxlTm9kZXM6IGFueVtdW10sIGV4cGVjdGVkU2xvdENvdW50OiBudW1iZXIpOiBhbnlbXVtdIHtcbiAgdmFyIHJlcztcbiAgaWYgKGlzQmxhbmsocHJvamVjdGFibGVOb2RlcykpIHtcbiAgICByZXMgPSBFTVBUWV9BUlI7XG4gIH0gZWxzZSBpZiAocHJvamVjdGFibGVOb2Rlcy5sZW5ndGggPCBleHBlY3RlZFNsb3RDb3VudCkge1xuICAgIHZhciBnaXZlblNsb3RDb3VudCA9IHByb2plY3RhYmxlTm9kZXMubGVuZ3RoO1xuICAgIHJlcyA9IExpc3RXcmFwcGVyLmNyZWF0ZUZpeGVkU2l6ZShleHBlY3RlZFNsb3RDb3VudCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHBlY3RlZFNsb3RDb3VudDsgaSsrKSB7XG4gICAgICByZXNbaV0gPSAoaSA8IGdpdmVuU2xvdENvdW50KSA/IHByb2plY3RhYmxlTm9kZXNbaV0gOiBFTVBUWV9BUlI7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJlcyA9IHByb2plY3RhYmxlTm9kZXM7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGNvbnN0IE1BWF9JTlRFUlBPTEFUSU9OX1ZBTFVFUyA9IDk7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcnBvbGF0ZSh2YWx1ZUNvdW50OiBudW1iZXIsIGMwOiBzdHJpbmcsIGExOiBhbnksIGMxOiBzdHJpbmcsIGEyPzogYW55LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMyPzogc3RyaW5nLCBhMz86IGFueSwgYzM/OiBzdHJpbmcsIGE0PzogYW55LCBjND86IHN0cmluZywgYTU/OiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYzU/OiBzdHJpbmcsIGE2PzogYW55LCBjNj86IHN0cmluZywgYTc/OiBhbnksIGM3Pzogc3RyaW5nLCBhOD86IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjOD86IHN0cmluZywgYTk/OiBhbnksIGM5Pzogc3RyaW5nKTogc3RyaW5nIHtcbiAgc3dpdGNoICh2YWx1ZUNvdW50KSB7XG4gICAgY2FzZSAxOlxuICAgICAgcmV0dXJuIGMwICsgX3RvU3RyaW5nV2l0aE51bGwoYTEpICsgYzE7XG4gICAgY2FzZSAyOlxuICAgICAgcmV0dXJuIGMwICsgX3RvU3RyaW5nV2l0aE51bGwoYTEpICsgYzEgKyBfdG9TdHJpbmdXaXRoTnVsbChhMikgKyBjMjtcbiAgICBjYXNlIDM6XG4gICAgICByZXR1cm4gYzAgKyBfdG9TdHJpbmdXaXRoTnVsbChhMSkgKyBjMSArIF90b1N0cmluZ1dpdGhOdWxsKGEyKSArIGMyICsgX3RvU3RyaW5nV2l0aE51bGwoYTMpICtcbiAgICAgICAgICAgICBjMztcbiAgICBjYXNlIDQ6XG4gICAgICByZXR1cm4gYzAgKyBfdG9TdHJpbmdXaXRoTnVsbChhMSkgKyBjMSArIF90b1N0cmluZ1dpdGhOdWxsKGEyKSArIGMyICsgX3RvU3RyaW5nV2l0aE51bGwoYTMpICtcbiAgICAgICAgICAgICBjMyArIF90b1N0cmluZ1dpdGhOdWxsKGE0KSArIGM0O1xuICAgIGNhc2UgNTpcbiAgICAgIHJldHVybiBjMCArIF90b1N0cmluZ1dpdGhOdWxsKGExKSArIGMxICsgX3RvU3RyaW5nV2l0aE51bGwoYTIpICsgYzIgKyBfdG9TdHJpbmdXaXRoTnVsbChhMykgK1xuICAgICAgICAgICAgIGMzICsgX3RvU3RyaW5nV2l0aE51bGwoYTQpICsgYzQgKyBfdG9TdHJpbmdXaXRoTnVsbChhNSkgKyBjNTtcbiAgICBjYXNlIDY6XG4gICAgICByZXR1cm4gYzAgKyBfdG9TdHJpbmdXaXRoTnVsbChhMSkgKyBjMSArIF90b1N0cmluZ1dpdGhOdWxsKGEyKSArIGMyICsgX3RvU3RyaW5nV2l0aE51bGwoYTMpICtcbiAgICAgICAgICAgICBjMyArIF90b1N0cmluZ1dpdGhOdWxsKGE0KSArIGM0ICsgX3RvU3RyaW5nV2l0aE51bGwoYTUpICsgYzUgKyBfdG9TdHJpbmdXaXRoTnVsbChhNikgK1xuICAgICAgICAgICAgIGM2O1xuICAgIGNhc2UgNzpcbiAgICAgIHJldHVybiBjMCArIF90b1N0cmluZ1dpdGhOdWxsKGExKSArIGMxICsgX3RvU3RyaW5nV2l0aE51bGwoYTIpICsgYzIgKyBfdG9TdHJpbmdXaXRoTnVsbChhMykgK1xuICAgICAgICAgICAgIGMzICsgX3RvU3RyaW5nV2l0aE51bGwoYTQpICsgYzQgKyBfdG9TdHJpbmdXaXRoTnVsbChhNSkgKyBjNSArIF90b1N0cmluZ1dpdGhOdWxsKGE2KSArXG4gICAgICAgICAgICAgYzYgKyBfdG9TdHJpbmdXaXRoTnVsbChhNykgKyBjNztcbiAgICBjYXNlIDg6XG4gICAgICByZXR1cm4gYzAgKyBfdG9TdHJpbmdXaXRoTnVsbChhMSkgKyBjMSArIF90b1N0cmluZ1dpdGhOdWxsKGEyKSArIGMyICsgX3RvU3RyaW5nV2l0aE51bGwoYTMpICtcbiAgICAgICAgICAgICBjMyArIF90b1N0cmluZ1dpdGhOdWxsKGE0KSArIGM0ICsgX3RvU3RyaW5nV2l0aE51bGwoYTUpICsgYzUgKyBfdG9TdHJpbmdXaXRoTnVsbChhNikgK1xuICAgICAgICAgICAgIGM2ICsgX3RvU3RyaW5nV2l0aE51bGwoYTcpICsgYzcgKyBfdG9TdHJpbmdXaXRoTnVsbChhOCkgKyBjODtcbiAgICBjYXNlIDk6XG4gICAgICByZXR1cm4gYzAgKyBfdG9TdHJpbmdXaXRoTnVsbChhMSkgKyBjMSArIF90b1N0cmluZ1dpdGhOdWxsKGEyKSArIGMyICsgX3RvU3RyaW5nV2l0aE51bGwoYTMpICtcbiAgICAgICAgICAgICBjMyArIF90b1N0cmluZ1dpdGhOdWxsKGE0KSArIGM0ICsgX3RvU3RyaW5nV2l0aE51bGwoYTUpICsgYzUgKyBfdG9TdHJpbmdXaXRoTnVsbChhNikgK1xuICAgICAgICAgICAgIGM2ICsgX3RvU3RyaW5nV2l0aE51bGwoYTcpICsgYzcgKyBfdG9TdHJpbmdXaXRoTnVsbChhOCkgKyBjOCArIF90b1N0cmluZ1dpdGhOdWxsKGE5KSArXG4gICAgICAgICAgICAgYzk7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKGBEb2VzIG5vdCBzdXBwb3J0IG1vcmUgdGhhbiA5IGV4cHJlc3Npb25zYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX3RvU3RyaW5nV2l0aE51bGwodjogYW55KTogc3RyaW5nIHtcbiAgcmV0dXJuIHYgIT0gbnVsbCA/IHYudG9TdHJpbmcoKSA6ICcnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tCaW5kaW5nKHRocm93T25DaGFuZ2U6IGJvb2xlYW4sIG9sZFZhbHVlOiBhbnksIG5ld1ZhbHVlOiBhbnkpOiBib29sZWFuIHtcbiAgaWYgKHRocm93T25DaGFuZ2UpIHtcbiAgICBpZiAoIWRldk1vZGVFcXVhbChvbGRWYWx1ZSwgbmV3VmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXhwcmVzc2lvbkNoYW5nZWRBZnRlckl0SGFzQmVlbkNoZWNrZWRFeGNlcHRpb24ob2xkVmFsdWUsIG5ld1ZhbHVlLCBudWxsKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAhbG9vc2VJZGVudGljYWwob2xkVmFsdWUsIG5ld1ZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlMb29zZUlkZW50aWNhbChhOiBhbnlbXSwgYjogYW55W10pOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7ICsraSkge1xuICAgIGlmICghbG9vc2VJZGVudGljYWwoYVtpXSwgYltpXSkpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcExvb3NlSWRlbnRpY2FsPFY+KG0xOiB7W2tleTogc3RyaW5nXTogVn0sIG0yOiB7W2tleTogc3RyaW5nXTogVn0pOiBib29sZWFuIHtcbiAgdmFyIGsxID0gU3RyaW5nTWFwV3JhcHBlci5rZXlzKG0xKTtcbiAgdmFyIGsyID0gU3RyaW5nTWFwV3JhcHBlci5rZXlzKG0yKTtcbiAgaWYgKGsxLmxlbmd0aCAhPSBrMi5sZW5ndGgpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIGtleTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrMS5sZW5ndGg7IGkrKykge1xuICAgIGtleSA9IGsxW2ldO1xuICAgIGlmICghbG9vc2VJZGVudGljYWwobTFba2V5XSwgbTJba2V5XSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG4iXX0=