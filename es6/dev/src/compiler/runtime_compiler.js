var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IS_DART, isBlank } from 'angular2/src/facade/lang';
import { BaseException } from 'angular2/src/facade/exceptions';
import { ListWrapper } from 'angular2/src/facade/collection';
import { PromiseWrapper } from 'angular2/src/facade/async';
import { createHostComponentMeta, CompileIdentifierMetadata } from './compile_metadata';
import { Injectable } from 'angular2/src/core/di';
import { StyleCompiler } from './style_compiler';
import { ViewCompiler } from './view_compiler/view_compiler';
import { TemplateParser } from './template_parser';
import { DirectiveNormalizer } from './directive_normalizer';
import { RuntimeMetadataResolver } from './runtime_metadata';
import { HostViewFactory } from 'angular2/src/core/linker/view';
import { HostViewFactoryRef_ } from 'angular2/src/core/linker/view_ref';
import { Compiler_ } from 'angular2/src/core/linker/compiler';
import { CompilerConfig } from './config';
import * as ir from './output/output_ast';
import { jitStatements } from './output/output_jit';
import { interpretStatements } from './output/output_interpreter';
import { InterpretiveAppViewInstanceFactory } from './output/interpretive_view';
import { XHR } from 'angular2/src/compiler/xhr';
/**
 * An internal module of the Angular compiler that begins with component types,
 * extracts templates, and eventually produces a compiled version of the component
 * ready for linking into an application.
 */
export let RuntimeCompiler = class RuntimeCompiler extends Compiler_ {
    constructor(_runtimeMetadataResolver, _templateNormalizer, _templateParser, _styleCompiler, _viewCompiler, _xhr, _genConfig) {
        super();
        this._runtimeMetadataResolver = _runtimeMetadataResolver;
        this._templateNormalizer = _templateNormalizer;
        this._templateParser = _templateParser;
        this._styleCompiler = _styleCompiler;
        this._viewCompiler = _viewCompiler;
        this._xhr = _xhr;
        this._genConfig = _genConfig;
        this._styleCache = new Map();
        this._hostCacheKeys = new Map();
        this._compiledTemplateCache = new Map();
        this._compiledTemplateDone = new Map();
    }
    compileInHost(componentType) {
        var compMeta = this._runtimeMetadataResolver.getDirectiveMetadata(componentType);
        var hostCacheKey = this._hostCacheKeys.get(componentType);
        if (isBlank(hostCacheKey)) {
            hostCacheKey = new Object();
            this._hostCacheKeys.set(componentType, hostCacheKey);
            assertComponent(compMeta);
            var hostMeta = createHostComponentMeta(compMeta.type, compMeta.selector);
            this._loadAndCompileComponent(hostCacheKey, hostMeta, [compMeta], [], []);
        }
        return this._compiledTemplateDone.get(hostCacheKey)
            .then((compiledTemplate) => new HostViewFactoryRef_(new HostViewFactory(compMeta.selector, compiledTemplate.viewFactory)));
    }
    clearCache() {
        this._styleCache.clear();
        this._compiledTemplateCache.clear();
        this._compiledTemplateDone.clear();
        this._hostCacheKeys.clear();
    }
    _loadAndCompileComponent(cacheKey, compMeta, viewDirectives, pipes, compilingComponentsPath) {
        var compiledTemplate = this._compiledTemplateCache.get(cacheKey);
        var done = this._compiledTemplateDone.get(cacheKey);
        if (isBlank(compiledTemplate)) {
            compiledTemplate = new CompiledTemplate();
            this._compiledTemplateCache.set(cacheKey, compiledTemplate);
            done =
                PromiseWrapper.all([this._compileComponentStyles(compMeta)].concat(viewDirectives.map(dirMeta => this._templateNormalizer.normalizeDirective(dirMeta))))
                    .then((stylesAndNormalizedViewDirMetas) => {
                    var normalizedViewDirMetas = stylesAndNormalizedViewDirMetas.slice(1);
                    var styles = stylesAndNormalizedViewDirMetas[0];
                    var parsedTemplate = this._templateParser.parse(compMeta, compMeta.template.template, normalizedViewDirMetas, pipes, compMeta.type.name);
                    var childPromises = [];
                    compiledTemplate.init(this._compileComponent(compMeta, parsedTemplate, styles, pipes, compilingComponentsPath, childPromises));
                    return PromiseWrapper.all(childPromises).then((_) => { return compiledTemplate; });
                });
            this._compiledTemplateDone.set(cacheKey, done);
        }
        return compiledTemplate;
    }
    _compileComponent(compMeta, parsedTemplate, styles, pipes, compilingComponentsPath, childPromises) {
        var compileResult = this._viewCompiler.compileComponent(compMeta, parsedTemplate, new ir.ExternalExpr(new CompileIdentifierMetadata({ runtime: styles })), pipes);
        compileResult.dependencies.forEach((dep) => {
            var childCompilingComponentsPath = ListWrapper.clone(compilingComponentsPath);
            var childCacheKey = dep.comp.type.runtime;
            var childViewDirectives = this._runtimeMetadataResolver.getViewDirectivesMetadata(dep.comp.type.runtime);
            var childViewPipes = this._runtimeMetadataResolver.getViewPipesMetadata(dep.comp.type.runtime);
            var childIsRecursive = ListWrapper.contains(childCompilingComponentsPath, childCacheKey);
            childCompilingComponentsPath.push(childCacheKey);
            var childComp = this._loadAndCompileComponent(dep.comp.type.runtime, dep.comp, childViewDirectives, childViewPipes, childCompilingComponentsPath);
            dep.factoryPlaceholder.runtime = childComp.proxyViewFactory;
            dep.factoryPlaceholder.name = `viewFactory_${dep.comp.type.name}`;
            if (!childIsRecursive) {
                // Only wait for a child if it is not a cycle
                childPromises.push(this._compiledTemplateDone.get(childCacheKey));
            }
        });
        var factory;
        if (IS_DART || !this._genConfig.useJit) {
            factory = interpretStatements(compileResult.statements, compileResult.viewFactoryVar, new InterpretiveAppViewInstanceFactory());
        }
        else {
            factory = jitStatements(`${compMeta.type.name}.template.js`, compileResult.statements, compileResult.viewFactoryVar);
        }
        return factory;
    }
    _compileComponentStyles(compMeta) {
        var compileResult = this._styleCompiler.compileComponent(compMeta);
        return this._resolveStylesCompileResult(compMeta.type.name, compileResult);
    }
    _resolveStylesCompileResult(sourceUrl, result) {
        var promises = result.dependencies.map((dep) => this._loadStylesheetDep(dep));
        return PromiseWrapper.all(promises)
            .then((cssTexts) => {
            var nestedCompileResultPromises = [];
            for (var i = 0; i < result.dependencies.length; i++) {
                var dep = result.dependencies[i];
                var cssText = cssTexts[i];
                var nestedCompileResult = this._styleCompiler.compileStylesheet(dep.sourceUrl, cssText, dep.isShimmed);
                nestedCompileResultPromises.push(this._resolveStylesCompileResult(dep.sourceUrl, nestedCompileResult));
            }
            return PromiseWrapper.all(nestedCompileResultPromises);
        })
            .then((nestedStylesArr) => {
            for (var i = 0; i < result.dependencies.length; i++) {
                var dep = result.dependencies[i];
                dep.valuePlaceholder.runtime = nestedStylesArr[i];
                dep.valuePlaceholder.name = `importedStyles${i}`;
            }
            if (IS_DART || !this._genConfig.useJit) {
                return interpretStatements(result.statements, result.stylesVar, new InterpretiveAppViewInstanceFactory());
            }
            else {
                return jitStatements(`${sourceUrl}.css.js`, result.statements, result.stylesVar);
            }
        });
    }
    _loadStylesheetDep(dep) {
        var cacheKey = `${dep.sourceUrl}${dep.isShimmed ? '.shim' : ''}`;
        var cssTextPromise = this._styleCache.get(cacheKey);
        if (isBlank(cssTextPromise)) {
            cssTextPromise = this._xhr.get(dep.sourceUrl);
            this._styleCache.set(cacheKey, cssTextPromise);
        }
        return cssTextPromise;
    }
};
RuntimeCompiler = __decorate([
    Injectable(), 
    __metadata('design:paramtypes', [RuntimeMetadataResolver, DirectiveNormalizer, TemplateParser, StyleCompiler, ViewCompiler, XHR, CompilerConfig])
], RuntimeCompiler);
class CompiledTemplate {
    constructor() {
        this.viewFactory = null;
        this.proxyViewFactory = (viewManager, childInjector, contextEl) => this.viewFactory(viewManager, childInjector, contextEl);
    }
    init(viewFactory) { this.viewFactory = viewFactory; }
}
function assertComponent(meta) {
    if (!meta.isComponent) {
        throw new BaseException(`Could not compile '${meta.type.name}' because it is not a component.`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZV9jb21waWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpZmZpbmdfcGx1Z2luX3dyYXBwZXItb3V0cHV0X3BhdGgtNkFoWGUyNkcudG1wL2FuZ3VsYXIyL3NyYy9jb21waWxlci9ydW50aW1lX2NvbXBpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztPQUFPLEVBQ0wsT0FBTyxFQUdQLE9BQU8sRUFJUixNQUFNLDBCQUEwQjtPQUMxQixFQUFDLGFBQWEsRUFBQyxNQUFNLGdDQUFnQztPQUNyRCxFQUNMLFdBQVcsRUFJWixNQUFNLGdDQUFnQztPQUNoQyxFQUFDLGNBQWMsRUFBQyxNQUFNLDJCQUEyQjtPQUNqRCxFQUNMLHVCQUF1QixFQU12Qix5QkFBeUIsRUFDMUIsTUFBTSxvQkFBb0I7T0FpQnBCLEVBQUMsVUFBVSxFQUFDLE1BQU0sc0JBQXNCO09BQ3hDLEVBQUMsYUFBYSxFQUErQyxNQUFNLGtCQUFrQjtPQUNyRixFQUFDLFlBQVksRUFBQyxNQUFNLCtCQUErQjtPQUNuRCxFQUFDLGNBQWMsRUFBQyxNQUFNLG1CQUFtQjtPQUN6QyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sd0JBQXdCO09BQ25ELEVBQUMsdUJBQXVCLEVBQUMsTUFBTSxvQkFBb0I7T0FDbkQsRUFBQyxlQUFlLEVBQUMsTUFBTSwrQkFBK0I7T0FDdEQsRUFBcUIsbUJBQW1CLEVBQUMsTUFBTSxtQ0FBbUM7T0FDbEYsRUFBVyxTQUFTLEVBQUMsTUFBTSxtQ0FBbUM7T0FFOUQsRUFBQyxjQUFjLEVBQUMsTUFBTSxVQUFVO09BQ2hDLEtBQUssRUFBRSxNQUFNLHFCQUFxQjtPQUNsQyxFQUFDLGFBQWEsRUFBQyxNQUFNLHFCQUFxQjtPQUMxQyxFQUFDLG1CQUFtQixFQUFDLE1BQU0sNkJBQTZCO09BQ3hELEVBQUMsa0NBQWtDLEVBQUMsTUFBTSw0QkFBNEI7T0FFdEUsRUFBQyxHQUFHLEVBQUMsTUFBTSwyQkFBMkI7QUFFN0M7Ozs7R0FJRztBQUVILDJEQUFxQyxTQUFTO0lBTTVDLFlBQW9CLHdCQUFpRCxFQUNqRCxtQkFBd0MsRUFDeEMsZUFBK0IsRUFBVSxjQUE2QixFQUN0RSxhQUEyQixFQUFVLElBQVMsRUFDOUMsVUFBMEI7UUFDNUMsT0FBTyxDQUFDO1FBTFUsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUF5QjtRQUNqRCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLG9CQUFlLEdBQWYsZUFBZSxDQUFnQjtRQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFlO1FBQ3RFLGtCQUFhLEdBQWIsYUFBYSxDQUFjO1FBQVUsU0FBSSxHQUFKLElBQUksQ0FBSztRQUM5QyxlQUFVLEdBQVYsVUFBVSxDQUFnQjtRQVR0QyxnQkFBVyxHQUFpQyxJQUFJLEdBQUcsRUFBMkIsQ0FBQztRQUMvRSxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFhLENBQUM7UUFDdEMsMkJBQXNCLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7UUFDMUQsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQWtDLENBQUM7SUFRMUUsQ0FBQztJQUVELGFBQWEsQ0FBQyxhQUFtQjtRQUMvQixJQUFJLFFBQVEsR0FDUixJQUFJLENBQUMsd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEUsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDMUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixZQUFZLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDckQsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFCLElBQUksUUFBUSxHQUNSLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTlELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7YUFDOUMsSUFBSSxDQUFDLENBQUMsZ0JBQWtDLEtBQUssSUFBSSxtQkFBbUIsQ0FDM0QsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdkYsQ0FBQztJQUVELFVBQVU7UUFDUixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR08sd0JBQXdCLENBQUMsUUFBYSxFQUFFLFFBQWtDLEVBQ2pELGNBQTBDLEVBQzFDLEtBQTRCLEVBQzVCLHVCQUE4QjtRQUM3RCxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakUsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLENBQUM7WUFDNUQsSUFBSTtnQkFDQSxjQUFjLENBQUMsR0FBRyxDQUNBLENBQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQ25FLE9BQU8sSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNuRixJQUFJLENBQUMsQ0FBQywrQkFBc0M7b0JBQzNDLElBQUksc0JBQXNCLEdBQUcsK0JBQStCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN0RSxJQUFJLE1BQU0sR0FBRywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxjQUFjLEdBQ2QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUNwQyxzQkFBc0IsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFFbEYsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO29CQUN2QixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUNoQyxLQUFLLEVBQUUsdUJBQXVCLEVBQzlCLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQzdELE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckYsQ0FBQyxDQUFDLENBQUM7WUFDWCxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0QsTUFBTSxDQUFDLGdCQUFnQixDQUFDO0lBQzFCLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxRQUFrQyxFQUFFLGNBQTZCLEVBQ2pFLE1BQWdCLEVBQUUsS0FBNEIsRUFDOUMsdUJBQThCLEVBQzlCLGFBQTZCO1FBQ3JELElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQ25ELFFBQVEsRUFBRSxjQUFjLEVBQ3hCLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLHlCQUF5QixDQUFDLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRixhQUFhLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUc7WUFDckMsSUFBSSw0QkFBNEIsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFFOUUsSUFBSSxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQzFDLElBQUksbUJBQW1CLEdBQ25CLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuRixJQUFJLGNBQWMsR0FDZCxJQUFJLENBQUMsd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3pGLDRCQUE0QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUVqRCxJQUFJLFNBQVMsR0FDVCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQ3BELGNBQWMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1lBQ2hGLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDO1lBQzVELEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEdBQUcsZUFBZSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdEIsNkNBQTZDO2dCQUM3QyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUNwRSxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE9BQU8sQ0FBQztRQUNaLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN2QyxPQUFPLEdBQUcsbUJBQW1CLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsY0FBYyxFQUN0RCxJQUFJLGtDQUFrQyxFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixPQUFPLEdBQUcsYUFBYSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLGNBQWMsRUFBRSxhQUFhLENBQUMsVUFBVSxFQUM3RCxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUNELE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVPLHVCQUF1QixDQUFDLFFBQWtDO1FBQ2hFLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkUsTUFBTSxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRU8sMkJBQTJCLENBQUMsU0FBaUIsRUFDakIsTUFBMkI7UUFDN0QsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDOUUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO2FBQzlCLElBQUksQ0FBQyxDQUFDLFFBQVE7WUFDYixJQUFJLDJCQUEyQixHQUFHLEVBQUUsQ0FBQztZQUNyQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BELElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxtQkFBbUIsR0FDbkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ2pGLDJCQUEyQixDQUFDLElBQUksQ0FDNUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQzVFLENBQUM7WUFDRCxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQzthQUNELElBQUksQ0FBQyxDQUFDLGVBQWU7WUFDcEIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNwRCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEQsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDbkQsQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFDbkMsSUFBSSxrQ0FBa0MsRUFBRSxDQUFDLENBQUM7WUFDdkUsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxTQUFTLFNBQVMsRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDVCxDQUFDO0lBRU8sa0JBQWtCLENBQUMsR0FBNEI7UUFDckQsSUFBSSxRQUFRLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLEdBQUcsT0FBTyxHQUFHLEVBQUUsRUFBRSxDQUFDO1FBQ2pFLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUIsY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUNELE1BQU0sQ0FBQyxjQUFjLENBQUM7SUFDeEIsQ0FBQztBQUNILENBQUM7QUE1SkQ7SUFBQyxVQUFVLEVBQUU7O21CQUFBO0FBOEpiO0lBR0U7UUFGQSxnQkFBVyxHQUFhLElBQUksQ0FBQztRQUczQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsS0FDMUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxJQUFJLENBQUMsV0FBcUIsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQztBQUVELHlCQUF5QixJQUE4QjtJQUNyRCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLE1BQU0sSUFBSSxhQUFhLENBQUMsc0JBQXNCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxrQ0FBa0MsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgSVNfREFSVCxcbiAgVHlwZSxcbiAgSnNvbixcbiAgaXNCbGFuayxcbiAgaXNQcmVzZW50LFxuICBzdHJpbmdpZnksXG4gIGV2YWxFeHByZXNzaW9uXG59IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5pbXBvcnQge1xuICBMaXN0V3JhcHBlcixcbiAgU2V0V3JhcHBlcixcbiAgTWFwV3JhcHBlcixcbiAgU3RyaW5nTWFwV3JhcHBlclxufSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHtQcm9taXNlV3JhcHBlcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2ZhY2FkZS9hc3luYyc7XG5pbXBvcnQge1xuICBjcmVhdGVIb3N0Q29tcG9uZW50TWV0YSxcbiAgQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLFxuICBDb21waWxlVHlwZU1ldGFkYXRhLFxuICBDb21waWxlVGVtcGxhdGVNZXRhZGF0YSxcbiAgQ29tcGlsZVBpcGVNZXRhZGF0YSxcbiAgQ29tcGlsZU1ldGFkYXRhV2l0aFR5cGUsXG4gIENvbXBpbGVJZGVudGlmaWVyTWV0YWRhdGFcbn0gZnJvbSAnLi9jb21waWxlX21ldGFkYXRhJztcbmltcG9ydCB7XG4gIFRlbXBsYXRlQXN0LFxuICBUZW1wbGF0ZUFzdFZpc2l0b3IsXG4gIE5nQ29udGVudEFzdCxcbiAgRW1iZWRkZWRUZW1wbGF0ZUFzdCxcbiAgRWxlbWVudEFzdCxcbiAgVmFyaWFibGVBc3QsXG4gIEJvdW5kRXZlbnRBc3QsXG4gIEJvdW5kRWxlbWVudFByb3BlcnR5QXN0LFxuICBBdHRyQXN0LFxuICBCb3VuZFRleHRBc3QsXG4gIFRleHRBc3QsXG4gIERpcmVjdGl2ZUFzdCxcbiAgQm91bmREaXJlY3RpdmVQcm9wZXJ0eUFzdCxcbiAgdGVtcGxhdGVWaXNpdEFsbFxufSBmcm9tICcuL3RlbXBsYXRlX2FzdCc7XG5pbXBvcnQge0luamVjdGFibGV9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2RpJztcbmltcG9ydCB7U3R5bGVDb21waWxlciwgU3R5bGVzQ29tcGlsZURlcGVuZGVuY3ksIFN0eWxlc0NvbXBpbGVSZXN1bHR9IGZyb20gJy4vc3R5bGVfY29tcGlsZXInO1xuaW1wb3J0IHtWaWV3Q29tcGlsZXJ9IGZyb20gJy4vdmlld19jb21waWxlci92aWV3X2NvbXBpbGVyJztcbmltcG9ydCB7VGVtcGxhdGVQYXJzZXJ9IGZyb20gJy4vdGVtcGxhdGVfcGFyc2VyJztcbmltcG9ydCB7RGlyZWN0aXZlTm9ybWFsaXplcn0gZnJvbSAnLi9kaXJlY3RpdmVfbm9ybWFsaXplcic7XG5pbXBvcnQge1J1bnRpbWVNZXRhZGF0YVJlc29sdmVyfSBmcm9tICcuL3J1bnRpbWVfbWV0YWRhdGEnO1xuaW1wb3J0IHtIb3N0Vmlld0ZhY3Rvcnl9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2xpbmtlci92aWV3JztcbmltcG9ydCB7SG9zdFZpZXdGYWN0b3J5UmVmLCBIb3N0Vmlld0ZhY3RvcnlSZWZffSBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9saW5rZXIvdmlld19yZWYnO1xuaW1wb3J0IHtDb21waWxlciwgQ29tcGlsZXJffSBmcm9tICdhbmd1bGFyMi9zcmMvY29yZS9saW5rZXIvY29tcGlsZXInO1xuXG5pbXBvcnQge0NvbXBpbGVyQ29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgKiBhcyBpciBmcm9tICcuL291dHB1dC9vdXRwdXRfYXN0JztcbmltcG9ydCB7aml0U3RhdGVtZW50c30gZnJvbSAnLi9vdXRwdXQvb3V0cHV0X2ppdCc7XG5pbXBvcnQge2ludGVycHJldFN0YXRlbWVudHN9IGZyb20gJy4vb3V0cHV0L291dHB1dF9pbnRlcnByZXRlcic7XG5pbXBvcnQge0ludGVycHJldGl2ZUFwcFZpZXdJbnN0YW5jZUZhY3Rvcnl9IGZyb20gJy4vb3V0cHV0L2ludGVycHJldGl2ZV92aWV3JztcblxuaW1wb3J0IHtYSFJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb21waWxlci94aHInO1xuXG4vKipcbiAqIEFuIGludGVybmFsIG1vZHVsZSBvZiB0aGUgQW5ndWxhciBjb21waWxlciB0aGF0IGJlZ2lucyB3aXRoIGNvbXBvbmVudCB0eXBlcyxcbiAqIGV4dHJhY3RzIHRlbXBsYXRlcywgYW5kIGV2ZW50dWFsbHkgcHJvZHVjZXMgYSBjb21waWxlZCB2ZXJzaW9uIG9mIHRoZSBjb21wb25lbnRcbiAqIHJlYWR5IGZvciBsaW5raW5nIGludG8gYW4gYXBwbGljYXRpb24uXG4gKi9cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBSdW50aW1lQ29tcGlsZXIgZXh0ZW5kcyBDb21waWxlcl8ge1xuICBwcml2YXRlIF9zdHlsZUNhY2hlOiBNYXA8c3RyaW5nLCBQcm9taXNlPHN0cmluZz4+ID0gbmV3IE1hcDxzdHJpbmcsIFByb21pc2U8c3RyaW5nPj4oKTtcbiAgcHJpdmF0ZSBfaG9zdENhY2hlS2V5cyA9IG5ldyBNYXA8VHlwZSwgYW55PigpO1xuICBwcml2YXRlIF9jb21waWxlZFRlbXBsYXRlQ2FjaGUgPSBuZXcgTWFwPGFueSwgQ29tcGlsZWRUZW1wbGF0ZT4oKTtcbiAgcHJpdmF0ZSBfY29tcGlsZWRUZW1wbGF0ZURvbmUgPSBuZXcgTWFwPGFueSwgUHJvbWlzZTxDb21waWxlZFRlbXBsYXRlPj4oKTtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9ydW50aW1lTWV0YWRhdGFSZXNvbHZlcjogUnVudGltZU1ldGFkYXRhUmVzb2x2ZXIsXG4gICAgICAgICAgICAgIHByaXZhdGUgX3RlbXBsYXRlTm9ybWFsaXplcjogRGlyZWN0aXZlTm9ybWFsaXplcixcbiAgICAgICAgICAgICAgcHJpdmF0ZSBfdGVtcGxhdGVQYXJzZXI6IFRlbXBsYXRlUGFyc2VyLCBwcml2YXRlIF9zdHlsZUNvbXBpbGVyOiBTdHlsZUNvbXBpbGVyLFxuICAgICAgICAgICAgICBwcml2YXRlIF92aWV3Q29tcGlsZXI6IFZpZXdDb21waWxlciwgcHJpdmF0ZSBfeGhyOiBYSFIsXG4gICAgICAgICAgICAgIHByaXZhdGUgX2dlbkNvbmZpZzogQ29tcGlsZXJDb25maWcpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgY29tcGlsZUluSG9zdChjb21wb25lbnRUeXBlOiBUeXBlKTogUHJvbWlzZTxIb3N0Vmlld0ZhY3RvcnlSZWZfPiB7XG4gICAgdmFyIGNvbXBNZXRhOiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEgPVxuICAgICAgICB0aGlzLl9ydW50aW1lTWV0YWRhdGFSZXNvbHZlci5nZXREaXJlY3RpdmVNZXRhZGF0YShjb21wb25lbnRUeXBlKTtcbiAgICB2YXIgaG9zdENhY2hlS2V5ID0gdGhpcy5faG9zdENhY2hlS2V5cy5nZXQoY29tcG9uZW50VHlwZSk7XG4gICAgaWYgKGlzQmxhbmsoaG9zdENhY2hlS2V5KSkge1xuICAgICAgaG9zdENhY2hlS2V5ID0gbmV3IE9iamVjdCgpO1xuICAgICAgdGhpcy5faG9zdENhY2hlS2V5cy5zZXQoY29tcG9uZW50VHlwZSwgaG9zdENhY2hlS2V5KTtcbiAgICAgIGFzc2VydENvbXBvbmVudChjb21wTWV0YSk7XG4gICAgICB2YXIgaG9zdE1ldGE6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSA9XG4gICAgICAgICAgY3JlYXRlSG9zdENvbXBvbmVudE1ldGEoY29tcE1ldGEudHlwZSwgY29tcE1ldGEuc2VsZWN0b3IpO1xuXG4gICAgICB0aGlzLl9sb2FkQW5kQ29tcGlsZUNvbXBvbmVudChob3N0Q2FjaGVLZXksIGhvc3RNZXRhLCBbY29tcE1ldGFdLCBbXSwgW10pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY29tcGlsZWRUZW1wbGF0ZURvbmUuZ2V0KGhvc3RDYWNoZUtleSlcbiAgICAgICAgLnRoZW4oKGNvbXBpbGVkVGVtcGxhdGU6IENvbXBpbGVkVGVtcGxhdGUpID0+IG5ldyBIb3N0Vmlld0ZhY3RvcnlSZWZfKFxuICAgICAgICAgICAgICAgICAgbmV3IEhvc3RWaWV3RmFjdG9yeShjb21wTWV0YS5zZWxlY3RvciwgY29tcGlsZWRUZW1wbGF0ZS52aWV3RmFjdG9yeSkpKTtcbiAgfVxuXG4gIGNsZWFyQ2FjaGUoKSB7XG4gICAgdGhpcy5fc3R5bGVDYWNoZS5jbGVhcigpO1xuICAgIHRoaXMuX2NvbXBpbGVkVGVtcGxhdGVDYWNoZS5jbGVhcigpO1xuICAgIHRoaXMuX2NvbXBpbGVkVGVtcGxhdGVEb25lLmNsZWFyKCk7XG4gICAgdGhpcy5faG9zdENhY2hlS2V5cy5jbGVhcigpO1xuICB9XG5cblxuICBwcml2YXRlIF9sb2FkQW5kQ29tcGlsZUNvbXBvbmVudChjYWNoZUtleTogYW55LCBjb21wTWV0YTogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3RGlyZWN0aXZlczogQ29tcGlsZURpcmVjdGl2ZU1ldGFkYXRhW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBpcGVzOiBDb21waWxlUGlwZU1ldGFkYXRhW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGluZ0NvbXBvbmVudHNQYXRoOiBhbnlbXSk6IENvbXBpbGVkVGVtcGxhdGUge1xuICAgIHZhciBjb21waWxlZFRlbXBsYXRlID0gdGhpcy5fY29tcGlsZWRUZW1wbGF0ZUNhY2hlLmdldChjYWNoZUtleSk7XG4gICAgdmFyIGRvbmUgPSB0aGlzLl9jb21waWxlZFRlbXBsYXRlRG9uZS5nZXQoY2FjaGVLZXkpO1xuICAgIGlmIChpc0JsYW5rKGNvbXBpbGVkVGVtcGxhdGUpKSB7XG4gICAgICBjb21waWxlZFRlbXBsYXRlID0gbmV3IENvbXBpbGVkVGVtcGxhdGUoKTtcbiAgICAgIHRoaXMuX2NvbXBpbGVkVGVtcGxhdGVDYWNoZS5zZXQoY2FjaGVLZXksIGNvbXBpbGVkVGVtcGxhdGUpO1xuICAgICAgZG9uZSA9XG4gICAgICAgICAgUHJvbWlzZVdyYXBwZXIuYWxsKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFs8YW55PnRoaXMuX2NvbXBpbGVDb21wb25lbnRTdHlsZXMoY29tcE1ldGEpXS5jb25jYXQodmlld0RpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJNZXRhID0+IHRoaXMuX3RlbXBsYXRlTm9ybWFsaXplci5ub3JtYWxpemVEaXJlY3RpdmUoZGlyTWV0YSkpKSlcbiAgICAgICAgICAgICAgLnRoZW4oKHN0eWxlc0FuZE5vcm1hbGl6ZWRWaWV3RGlyTWV0YXM6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbGl6ZWRWaWV3RGlyTWV0YXMgPSBzdHlsZXNBbmROb3JtYWxpemVkVmlld0Rpck1ldGFzLnNsaWNlKDEpO1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZXMgPSBzdHlsZXNBbmROb3JtYWxpemVkVmlld0Rpck1ldGFzWzBdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZWRUZW1wbGF0ZSA9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3RlbXBsYXRlUGFyc2VyLnBhcnNlKGNvbXBNZXRhLCBjb21wTWV0YS50ZW1wbGF0ZS50ZW1wbGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9ybWFsaXplZFZpZXdEaXJNZXRhcywgcGlwZXMsIGNvbXBNZXRhLnR5cGUubmFtZSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgY2hpbGRQcm9taXNlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGNvbXBpbGVkVGVtcGxhdGUuaW5pdCh0aGlzLl9jb21waWxlQ29tcG9uZW50KGNvbXBNZXRhLCBwYXJzZWRUZW1wbGF0ZSwgc3R5bGVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBpcGVzLCBjb21waWxpbmdDb21wb25lbnRzUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZFByb21pc2VzKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLmFsbChjaGlsZFByb21pc2VzKS50aGVuKChfKSA9PiB7IHJldHVybiBjb21waWxlZFRlbXBsYXRlOyB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICB0aGlzLl9jb21waWxlZFRlbXBsYXRlRG9uZS5zZXQoY2FjaGVLZXksIGRvbmUpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZWRUZW1wbGF0ZTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbXBpbGVDb21wb25lbnQoY29tcE1ldGE6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSwgcGFyc2VkVGVtcGxhdGU6IFRlbXBsYXRlQXN0W10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVzOiBzdHJpbmdbXSwgcGlwZXM6IENvbXBpbGVQaXBlTWV0YWRhdGFbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxpbmdDb21wb25lbnRzUGF0aDogYW55W10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRQcm9taXNlczogUHJvbWlzZTxhbnk+W10pOiBGdW5jdGlvbiB7XG4gICAgdmFyIGNvbXBpbGVSZXN1bHQgPSB0aGlzLl92aWV3Q29tcGlsZXIuY29tcGlsZUNvbXBvbmVudChcbiAgICAgICAgY29tcE1ldGEsIHBhcnNlZFRlbXBsYXRlLFxuICAgICAgICBuZXcgaXIuRXh0ZXJuYWxFeHByKG5ldyBDb21waWxlSWRlbnRpZmllck1ldGFkYXRhKHtydW50aW1lOiBzdHlsZXN9KSksIHBpcGVzKTtcbiAgICBjb21waWxlUmVzdWx0LmRlcGVuZGVuY2llcy5mb3JFYWNoKChkZXApID0+IHtcbiAgICAgIHZhciBjaGlsZENvbXBpbGluZ0NvbXBvbmVudHNQYXRoID0gTGlzdFdyYXBwZXIuY2xvbmUoY29tcGlsaW5nQ29tcG9uZW50c1BhdGgpO1xuXG4gICAgICB2YXIgY2hpbGRDYWNoZUtleSA9IGRlcC5jb21wLnR5cGUucnVudGltZTtcbiAgICAgIHZhciBjaGlsZFZpZXdEaXJlY3RpdmVzOiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGFbXSA9XG4gICAgICAgICAgdGhpcy5fcnVudGltZU1ldGFkYXRhUmVzb2x2ZXIuZ2V0Vmlld0RpcmVjdGl2ZXNNZXRhZGF0YShkZXAuY29tcC50eXBlLnJ1bnRpbWUpO1xuICAgICAgdmFyIGNoaWxkVmlld1BpcGVzOiBDb21waWxlUGlwZU1ldGFkYXRhW10gPVxuICAgICAgICAgIHRoaXMuX3J1bnRpbWVNZXRhZGF0YVJlc29sdmVyLmdldFZpZXdQaXBlc01ldGFkYXRhKGRlcC5jb21wLnR5cGUucnVudGltZSk7XG4gICAgICB2YXIgY2hpbGRJc1JlY3Vyc2l2ZSA9IExpc3RXcmFwcGVyLmNvbnRhaW5zKGNoaWxkQ29tcGlsaW5nQ29tcG9uZW50c1BhdGgsIGNoaWxkQ2FjaGVLZXkpO1xuICAgICAgY2hpbGRDb21waWxpbmdDb21wb25lbnRzUGF0aC5wdXNoKGNoaWxkQ2FjaGVLZXkpO1xuXG4gICAgICB2YXIgY2hpbGRDb21wID1cbiAgICAgICAgICB0aGlzLl9sb2FkQW5kQ29tcGlsZUNvbXBvbmVudChkZXAuY29tcC50eXBlLnJ1bnRpbWUsIGRlcC5jb21wLCBjaGlsZFZpZXdEaXJlY3RpdmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkVmlld1BpcGVzLCBjaGlsZENvbXBpbGluZ0NvbXBvbmVudHNQYXRoKTtcbiAgICAgIGRlcC5mYWN0b3J5UGxhY2Vob2xkZXIucnVudGltZSA9IGNoaWxkQ29tcC5wcm94eVZpZXdGYWN0b3J5O1xuICAgICAgZGVwLmZhY3RvcnlQbGFjZWhvbGRlci5uYW1lID0gYHZpZXdGYWN0b3J5XyR7ZGVwLmNvbXAudHlwZS5uYW1lfWA7XG4gICAgICBpZiAoIWNoaWxkSXNSZWN1cnNpdmUpIHtcbiAgICAgICAgLy8gT25seSB3YWl0IGZvciBhIGNoaWxkIGlmIGl0IGlzIG5vdCBhIGN5Y2xlXG4gICAgICAgIGNoaWxkUHJvbWlzZXMucHVzaCh0aGlzLl9jb21waWxlZFRlbXBsYXRlRG9uZS5nZXQoY2hpbGRDYWNoZUtleSkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHZhciBmYWN0b3J5O1xuICAgIGlmIChJU19EQVJUIHx8ICF0aGlzLl9nZW5Db25maWcudXNlSml0KSB7XG4gICAgICBmYWN0b3J5ID0gaW50ZXJwcmV0U3RhdGVtZW50cyhjb21waWxlUmVzdWx0LnN0YXRlbWVudHMsIGNvbXBpbGVSZXN1bHQudmlld0ZhY3RvcnlWYXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgSW50ZXJwcmV0aXZlQXBwVmlld0luc3RhbmNlRmFjdG9yeSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmFjdG9yeSA9IGppdFN0YXRlbWVudHMoYCR7Y29tcE1ldGEudHlwZS5uYW1lfS50ZW1wbGF0ZS5qc2AsIGNvbXBpbGVSZXN1bHQuc3RhdGVtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGVSZXN1bHQudmlld0ZhY3RvcnlWYXIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFjdG9yeTtcbiAgfVxuXG4gIHByaXZhdGUgX2NvbXBpbGVDb21wb25lbnRTdHlsZXMoY29tcE1ldGE6IENvbXBpbGVEaXJlY3RpdmVNZXRhZGF0YSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICB2YXIgY29tcGlsZVJlc3VsdCA9IHRoaXMuX3N0eWxlQ29tcGlsZXIuY29tcGlsZUNvbXBvbmVudChjb21wTWV0YSk7XG4gICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVTdHlsZXNDb21waWxlUmVzdWx0KGNvbXBNZXRhLnR5cGUubmFtZSwgY29tcGlsZVJlc3VsdCk7XG4gIH1cblxuICBwcml2YXRlIF9yZXNvbHZlU3R5bGVzQ29tcGlsZVJlc3VsdChzb3VyY2VVcmw6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBTdHlsZXNDb21waWxlUmVzdWx0KTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIHZhciBwcm9taXNlcyA9IHJlc3VsdC5kZXBlbmRlbmNpZXMubWFwKChkZXApID0+IHRoaXMuX2xvYWRTdHlsZXNoZWV0RGVwKGRlcCkpO1xuICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5hbGwocHJvbWlzZXMpXG4gICAgICAgIC50aGVuKChjc3NUZXh0cykgPT4ge1xuICAgICAgICAgIHZhciBuZXN0ZWRDb21waWxlUmVzdWx0UHJvbWlzZXMgPSBbXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdC5kZXBlbmRlbmNpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkZXAgPSByZXN1bHQuZGVwZW5kZW5jaWVzW2ldO1xuICAgICAgICAgICAgdmFyIGNzc1RleHQgPSBjc3NUZXh0c1tpXTtcbiAgICAgICAgICAgIHZhciBuZXN0ZWRDb21waWxlUmVzdWx0ID1cbiAgICAgICAgICAgICAgICB0aGlzLl9zdHlsZUNvbXBpbGVyLmNvbXBpbGVTdHlsZXNoZWV0KGRlcC5zb3VyY2VVcmwsIGNzc1RleHQsIGRlcC5pc1NoaW1tZWQpO1xuICAgICAgICAgICAgbmVzdGVkQ29tcGlsZVJlc3VsdFByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzb2x2ZVN0eWxlc0NvbXBpbGVSZXN1bHQoZGVwLnNvdXJjZVVybCwgbmVzdGVkQ29tcGlsZVJlc3VsdCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gUHJvbWlzZVdyYXBwZXIuYWxsKG5lc3RlZENvbXBpbGVSZXN1bHRQcm9taXNlcyk7XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKChuZXN0ZWRTdHlsZXNBcnIpID0+IHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdC5kZXBlbmRlbmNpZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBkZXAgPSByZXN1bHQuZGVwZW5kZW5jaWVzW2ldO1xuICAgICAgICAgICAgZGVwLnZhbHVlUGxhY2Vob2xkZXIucnVudGltZSA9IG5lc3RlZFN0eWxlc0FycltpXTtcbiAgICAgICAgICAgIGRlcC52YWx1ZVBsYWNlaG9sZGVyLm5hbWUgPSBgaW1wb3J0ZWRTdHlsZXMke2l9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKElTX0RBUlQgfHwgIXRoaXMuX2dlbkNvbmZpZy51c2VKaXQpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnByZXRTdGF0ZW1lbnRzKHJlc3VsdC5zdGF0ZW1lbnRzLCByZXN1bHQuc3R5bGVzVmFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEludGVycHJldGl2ZUFwcFZpZXdJbnN0YW5jZUZhY3RvcnkoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBqaXRTdGF0ZW1lbnRzKGAke3NvdXJjZVVybH0uY3NzLmpzYCwgcmVzdWx0LnN0YXRlbWVudHMsIHJlc3VsdC5zdHlsZXNWYXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9sb2FkU3R5bGVzaGVldERlcChkZXA6IFN0eWxlc0NvbXBpbGVEZXBlbmRlbmN5KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICB2YXIgY2FjaGVLZXkgPSBgJHtkZXAuc291cmNlVXJsfSR7ZGVwLmlzU2hpbW1lZCA/ICcuc2hpbScgOiAnJ31gO1xuICAgIHZhciBjc3NUZXh0UHJvbWlzZSA9IHRoaXMuX3N0eWxlQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgICBpZiAoaXNCbGFuayhjc3NUZXh0UHJvbWlzZSkpIHtcbiAgICAgIGNzc1RleHRQcm9taXNlID0gdGhpcy5feGhyLmdldChkZXAuc291cmNlVXJsKTtcbiAgICAgIHRoaXMuX3N0eWxlQ2FjaGUuc2V0KGNhY2hlS2V5LCBjc3NUZXh0UHJvbWlzZSk7XG4gICAgfVxuICAgIHJldHVybiBjc3NUZXh0UHJvbWlzZTtcbiAgfVxufVxuXG5jbGFzcyBDb21waWxlZFRlbXBsYXRlIHtcbiAgdmlld0ZhY3Rvcnk6IEZ1bmN0aW9uID0gbnVsbDtcbiAgcHJveHlWaWV3RmFjdG9yeTogRnVuY3Rpb247XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucHJveHlWaWV3RmFjdG9yeSA9ICh2aWV3TWFuYWdlciwgY2hpbGRJbmplY3RvciwgY29udGV4dEVsKSA9PlxuICAgICAgICB0aGlzLnZpZXdGYWN0b3J5KHZpZXdNYW5hZ2VyLCBjaGlsZEluamVjdG9yLCBjb250ZXh0RWwpO1xuICB9XG5cbiAgaW5pdCh2aWV3RmFjdG9yeTogRnVuY3Rpb24pIHsgdGhpcy52aWV3RmFjdG9yeSA9IHZpZXdGYWN0b3J5OyB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydENvbXBvbmVudChtZXRhOiBDb21waWxlRGlyZWN0aXZlTWV0YWRhdGEpIHtcbiAgaWYgKCFtZXRhLmlzQ29tcG9uZW50KSB7XG4gICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYENvdWxkIG5vdCBjb21waWxlICcke21ldGEudHlwZS5uYW1lfScgYmVjYXVzZSBpdCBpcyBub3QgYSBjb21wb25lbnQuYCk7XG4gIH1cbn1cbiJdfQ==