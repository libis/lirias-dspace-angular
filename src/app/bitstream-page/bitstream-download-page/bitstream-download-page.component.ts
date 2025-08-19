import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { hasValue, isNotEmpty } from '../../shared/empty.util';
import { getRemoteDataPayload } from '../../core/shared/operators';
import { Bitstream } from '../../core/shared/bitstream.model';
import { AuthorizationDataService } from '../../core/data/feature-authorization/authorization-data.service';
import { FeatureID } from '../../core/data/feature-authorization/feature-id';
import { AuthService } from '../../core/auth/auth.service';
import { combineLatest as observableCombineLatest, Observable, of as observableOf } from 'rxjs';
import { FileService } from '../../core/shared/file.service';
import { HardRedirectService } from '../../core/services/hard-redirect.service';
import { getForbiddenRoute } from '../../app-routing-paths';
import { RemoteData } from '../../core/data/remote-data';
import { isPlatformServer, Location } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { DSONameService } from '../../core/breadcrumbs/dso-name.service';
import { SignpostingDataService } from '../../core/data/signposting-data.service';
import { ServerResponseService } from '../../core/services/server-response.service';
import { SignpostingLink } from '../../core/data/signposting-links.model';
import { HALEndpointService } from 'src/app/core/shared/hal-endpoint.service';

@Component({
  selector: 'ds-bitstream-download-page',
  templateUrl: './bitstream-download-page.component.html'
})
/**
 * Page component for downloading a bitstream
 */
export class BitstreamDownloadPageComponent implements OnInit {

  bitstream$: Observable<Bitstream>;
  bitstreamRD$: Observable<RemoteData<Bitstream>>;

  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private authorizationService: AuthorizationDataService,
    private auth: AuthService,
    private fileService: FileService,
    private hardRedirectService: HardRedirectService,
    private location: Location,
    public dsoNameService: DSONameService,
    private signpostingDataService: SignpostingDataService,
    private responseService: ServerResponseService,
    private halService: HALEndpointService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) protected platformId: string
  ) {
    this.initPageLinks();
  }

  back(): void {
    this.location.back();
  }

  ngOnInit(): void {

    this.bitstreamRD$ = this.route.data.pipe(
      map((data) => data.bitstream));

    this.bitstream$ = this.bitstreamRD$.pipe(
      getRemoteDataPayload()
    );

    this.bitstream$.pipe(
      switchMap((bitstream: Bitstream) => {
        const isAuthorized$ = this.authorizationService.isAuthorized(FeatureID.CanDownload, isNotEmpty(bitstream) ? bitstream.self : undefined);
        const isLoggedIn$ = this.auth.isAuthenticated();
        return observableCombineLatest([isAuthorized$, isLoggedIn$, observableOf(bitstream)]);
      }),
      filter(([isAuthorized, isLoggedIn, bitstream]: [boolean, boolean, Bitstream]) => hasValue(isAuthorized) && hasValue(isLoggedIn)),
      take(1),
      switchMap(([isAuthorized, isLoggedIn, bitstream]: [boolean, boolean, Bitstream]) => {
        if (isAuthorized && isLoggedIn) {
          return this.fileService.retrieveFileDownloadLink(bitstream._links.content.href).pipe(
            filter((fileLink) => hasValue(fileLink)),
            take(1),
            map((fileLink) => {
              return [isAuthorized, isLoggedIn, bitstream, fileLink];
            }));
        } else {
          return [[isAuthorized, isLoggedIn, bitstream, '']];
        }
      })
    ).subscribe(([isAuthorized, isLoggedIn, bitstream, fileLink]: [boolean, boolean, Bitstream, string]) => {
      if (isAuthorized && isLoggedIn && isNotEmpty(fileLink)) {
        // Use HttpClient to retrieve the blob so we know the download finished,
        // then trigger save and redirect. On failure, redirect to /500.
        this.downloadAndRedirect(fileLink);
      } else if (isAuthorized && !isLoggedIn) {
        this.hardRedirectService.redirect(bitstream._links.content.href);
      } else if (!isAuthorized && isLoggedIn) {
        this.router.navigateByUrl(getForbiddenRoute(), {skipLocationChange: true});
      } else if (!isAuthorized && !isLoggedIn) {
        this.route.paramMap.subscribe((map) => {
          this.hardRedirectService.redirect(this.halService.getRootHref() + "/core/bitstreams/" + map.get('id') + '/content');
        });
      }
    });
  }

  /**
   * Download a file via HttpClient (await full blob) to detect completion, then trigger save and redirect.
   * On any failure, redirect to the deployed site's /500 error page (same origin).
   */
  private downloadAndRedirect(fileLink: string): void {
    const redirectUrl = 'https://research.kuleuven.be/en/lirias/download-started';
    const errorUrl = `${window.location.origin}/500`;

    // Use Angular HttpClient so auth interceptors, cookies and CSRF/XSRF tokens are applied consistently.
  this.http.get(fileLink, {
      observe: 'response',
      responseType: 'blob',
      withCredentials: true
    }).pipe(take(1)).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        // Validate body presence
        if (!resp.body || !(resp.body instanceof Blob) || resp.body.size === 0) {
          this.hardRedirectService.redirect(errorUrl);
          return;
        }
        // Extract filename from Content-Disposition
        const disposition = resp.headers.get('content-disposition') || '';
        let filename = 'download';
        const fnameStar = disposition.match(/filename\*=(?:UTF-8''|)([^;\n]+)/i);
        const fname = disposition.match(/filename=\"?([^\";\n]+)\"?/i);
        if (fnameStar && fnameStar[1]) {
          try { filename = decodeURIComponent(fnameStar[1]); } catch { filename = fnameStar[1]; }
        } else if (fname && fname[1]) {
          filename = fname[1];
        }

        const blob = resp.body as Blob;
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);

        // The network download has completed (blob received). If a browser/system
        // download dialog appears, many browsers blur the window and refocus when the
        // dialog is closed. Use blur/focus as a generic signal of user interaction.
        // If there's no blur shortly after the click, assume no dialog and redirect.
        const noDialogFallbackMs = 1000;   // redirect if no blur occurs within 1s
        const maxWaitMs = 120000;          // absolute cap to avoid waiting forever

        let didBlur = false;
        const onBlur = () => { didBlur = true; };
        const onFocus = () => {
          if (didBlur) {
            cleanupAndRedirect();
          }
        };

        const cleanup = () => {
          window.removeEventListener('blur', onBlur);
          window.removeEventListener('focus', onFocus);
          clearTimeout(noDialogTimer);
          clearTimeout(maxWaitTimer);
        };

        const cleanupAndRedirect = () => {
          cleanup();
          this.hardRedirectService.redirect(redirectUrl);
        };

        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);

        const noDialogTimer = setTimeout(() => {
          if (!didBlur) {
            cleanupAndRedirect();
          }
        }, noDialogFallbackMs);

        const maxWaitTimer = setTimeout(() => {
          cleanupAndRedirect();
        }, maxWaitMs);
      },
      error: () => {
        // Simplified failure handling: redirect to error page on same origin
        this.hardRedirectService.redirect(errorUrl);
      }
    });
  }

  /**
   * Create page links if any are retrieved by signposting endpoint
   *
   * @private
   */
  private initPageLinks(): void {
    if (isPlatformServer(this.platformId)) {
      this.route.params.subscribe(params => {
        this.signpostingDataService.getLinks(params.id).pipe(take(1)).subscribe((signpostingLinks: SignpostingLink[]) => {
          let links = '';

          signpostingLinks.forEach((link: SignpostingLink) => {
            links = links + (isNotEmpty(links) ? ', ' : '') + `<${link.href}> ; rel="${link.rel}"` + (isNotEmpty(link.type) ? ` ; type="${link.type}" ` : ' ');
          });

          this.responseService.setHeader('Link', links);
        });
      });
    }
  }
}
