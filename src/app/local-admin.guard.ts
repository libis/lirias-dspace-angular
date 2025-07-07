import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, map, Observable, switchMap} from 'rxjs';
import { AuthService } from 'src/app/core/auth/auth.service';
import { getFirstSucceededRemoteData, getRemoteDataPayload } from 'src/app/core/shared/operators';
import { returnForbiddenUrlTreeOrLoginOnAllFalse } from 'src/app/core/shared/authorized.operators';
import { Injectable } from '@angular/core';
import { followLink } from 'src/app/shared/utils/follow-link-config.model';
import { EPersonDataService } from 'src/app/core/eperson/eperson-data.service';
import { AuthorizationDataService } from './core/data/feature-authorization/authorization-data.service';
import { FeatureID } from './core/data/feature-authorization/feature-id';

@Injectable({
  providedIn: 'root'
})
export class LocalAdminGuard implements CanActivate {
  constructor(protected router: Router, protected authService: AuthService, protected epersonService: EPersonDataService, protected authorizationService: AuthorizationDataService) {
  }

  canActivate(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.authorizationService.isAuthorized(FeatureID.AdministratorOf, undefined, undefined, false)) {
      console.log('authorized as administrator in local admin guard');
      return true;
    }
    return this.authService.getAuthenticatedUserFromStore()
      .pipe(switchMap((user) => this.epersonService.findById(user.id, true, true, followLink('groups'))))
      .pipe(getFirstSucceededRemoteData())
      .pipe(getRemoteDataPayload())
      .pipe(switchMap((user) => user.groups))
      .pipe(getFirstSucceededRemoteData())
      .pipe(getRemoteDataPayload())
      .pipe(map((groups) => groups.page.map((g) => g.name === 'Admins_local')))
      .pipe(catchError(_ => [false]))
      .pipe(returnForbiddenUrlTreeOrLoginOnAllFalse(this.router, this.authService, state.url));
  }
}
